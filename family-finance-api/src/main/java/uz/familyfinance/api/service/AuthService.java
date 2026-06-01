package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.dto.request.LoginRequest;
import uz.familyfinance.api.dto.request.RegisterRequest;
import uz.familyfinance.api.dto.response.JwtResponse;
import uz.familyfinance.api.dto.response.UserResponse;
import uz.familyfinance.api.entity.*;
import uz.familyfinance.api.enums.FamilyRole;
import uz.familyfinance.api.enums.MembershipStatus;
import uz.familyfinance.api.enums.Role;
import uz.familyfinance.api.enums.ScopeRole;
import uz.familyfinance.api.enums.ScopeType;
import uz.familyfinance.api.exception.AccountDisabledException;
import uz.familyfinance.api.exception.AccountLockedException;
import uz.familyfinance.api.exception.BadRequestException;
import uz.familyfinance.api.exception.ResourceNotFoundException;
import uz.familyfinance.api.repository.FamilyGroupRepository;
import uz.familyfinance.api.repository.FamilyMemberRepository;
import uz.familyfinance.api.repository.RoleRepository;
import uz.familyfinance.api.repository.ScopeMembershipRepository;
import uz.familyfinance.api.repository.ScopeRepository;
import uz.familyfinance.api.repository.UserRepository;
import uz.familyfinance.api.security.CustomUserDetails;
import uz.familyfinance.api.security.JwtTokenProvider;
import uz.familyfinance.api.util.HouseholdCodeGenerator;
import uz.familyfinance.api.util.InviteCodeGenerator;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final FamilyGroupRepository familyGroupRepository;
    private final ScopeRepository scopeRepository;
    private final ScopeMembershipRepository scopeMembershipRepository;
    private final ScopeMembershipService scopeMembershipService;
    private final PasswordEncoder passwordEncoder;
    private final SessionService sessionService;
    private final LoginAttemptService loginAttemptService;
    private final AuditLogService auditLogService;
    private final InviteCodeGenerator inviteCodeGenerator;
    private final HouseholdCodeGenerator householdCodeGenerator;

    @Value("${jwt.expiration}")
    private long jwtExpiration;

    @Transactional
    public UserResponse register(RegisterRequest request) {
        // Check username uniqueness
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("Bu username allaqachon band");
        }

        // Validate password match
        if (!request.getPassword().equals(request.getConfirmPassword())) {
            throw new IllegalArgumentException("Parol va tasdiqlash mos kelmadi");
        }

        // Validate password strength
        validatePassword(request.getPassword());

        // Find MEMBER role
        RoleEntity memberRole = roleRepository.findByCode("MEMBER")
                .orElseThrow(() -> new ResourceNotFoundException("Rol topilmadi: MEMBER"));

        // Create user
        User user = User.builder()
                .username(request.getUsername())
                .password(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .email(request.getEmail())
                .phone(request.getPhone())
                .role(Role.MEMBER) // Legacy field
                .active(true)
                .mustChangePassword(false)
                .build();

        user.getRoles().add(memberRole);
        user = userRepository.save(user);

        // YANGI: Scope provisioning ikki yo'l bilan:
        // 1) inviteCode bor bo'lsa — mavjud oilaga MEMBER bo'lib qo'shiladi
        // 2) inviteCode yo'q bo'lsa — yangi CLAN+HOUSEHOLD yaratiladi (auto-provisioning)
        String code = request.getInviteCode() != null ? request.getInviteCode().trim() : "";
        if (!code.isEmpty()) {
            joinExistingScopeByCode(user, code, request);
        } else {
            provisionInitialScopeFor(user, request);
        }

        // Audit log (userId=null to avoid FK constraint since user is not yet committed)
        auditLogService.log(
                "User",
                user.getId(),
                "USER_REGISTERED",
                null,
                String.format("Foydalanuvchi ro'yxatdan o'tdi: %s", user.getUsername()),
                null
        );

        log.info("New user registered: {} with new clan/household scopes", user.getUsername());

        return UserResponse.from(user);
    }

    /**
     * Yangi ro'yxatdan o'tgan user uchun to'liq scope strukturasini yaratadi:
     * <ol>
     *   <li>FamilyGroup (legacy uyg'unligi uchun)</li>
     *   <li>CLAN scope (parent=null, owner=user)</li>
     *   <li>HOUSEHOLD scope (parent=CLAN, owner=user)</li>
     *   <li>2 ta ScopeMembership: ikkalasida ham OWNER role</li>
     *   <li>User.familyGroup va User.primaryScope (=household) o'rnatiladi</li>
     *   <li>FamilyMember (legacy) — yangi familyGroup'ga biriktiriladi</li>
     * </ol>
     */
    private void provisionInitialScopeFor(User user, RegisterRequest request) {
        String displayName = buildDisplayName(request);
        provisionScopeAndFamilyGroup(user, displayName, request.getFirstName(), request.getLastName());
    }

    /**
     * Mavjud Scope'ga (invite code orqali) user'ni MEMBER bo'lib qo'shadi.
     * <ul>
     *   <li>Kod prefiksiga ko'ra: C=CLAN, H=HOUSEHOLD, P=PROJECT, EVENT...</li>
     *   <li>HOUSEHOLD kodi bilan kelsa: HOUSEHOLD'ga MEMBER + parent CLAN'ga ham MEMBER</li>
     *   <li>CLAN kodi bilan kelsa: CLAN'ga MEMBER + birinchi HOUSEHOLD'ga ham MEMBER (agar bor bo'lsa)</li>
     *   <li>User.familyGroup va User.primaryScope (=HOUSEHOLD) o'rnatiladi</li>
     *   <li>FamilyMember (legacy) yaratiladi va familyGroup'ga biriktiriladi</li>
     * </ul>
     */
    private void joinExistingScopeByCode(User user, String inviteCode, RegisterRequest request) {
        Scope targetScope = scopeRepository.findByUniqueCode(inviteCode)
                .filter(s -> Boolean.TRUE.equals(s.getIsActive()))
                .orElseThrow(() -> new BadRequestException(
                        "Taklif kodi noto'g'ri yoki bekor qilingan: " + inviteCode));

        // CLAN va HOUSEHOLD scope'larini aniqlash
        Scope clan;
        Scope household;
        if (targetScope.getType() == ScopeType.CLAN) {
            clan = targetScope;
            household = scopeRepository.findFirstByParentScopeIdAndTypeAndIsActiveTrue(
                    clan.getId(), ScopeType.HOUSEHOLD)
                    .orElseThrow(() -> new BadRequestException(
                            "Bu urug'da hech qanday faol xonadon topilmadi"));
        } else if (targetScope.getType() == ScopeType.HOUSEHOLD) {
            household = targetScope;
            clan = targetScope.getParentScope();
            if (clan == null || clan.getType() != ScopeType.CLAN) {
                throw new BadRequestException("Xonadon tegishli urug'ga ulanmagan");
            }
        } else {
            throw new BadRequestException(
                    "Ushbu kod orqali ro'yxatdan o'tish faqat CLAN/HOUSEHOLD uchun mumkin");
        }

        FamilyGroup familyGroup = clan.getLegacyFamilyGroup();
        if (familyGroup == null) {
            throw new IllegalStateException(
                    "Tanlangan urug'ning eski oila guruhi yo'q — qo'lda fix talab etiladi");
        }

        // 1) CLAN'ga MEMBER bo'lib qo'shish (agar yo'q bo'lsa)
        scopeMembershipService.addMembershipIfAbsent(clan, user, ScopeRole.MEMBER);
        // 2) HOUSEHOLD'ga MEMBER bo'lib qo'shish
        scopeMembershipService.addMembershipIfAbsent(household, user, ScopeRole.MEMBER);

        // 3) User'ni familyGroup va primaryScope ga bog'lash
        user.setFamilyGroup(familyGroup);
        user.setPrimaryScope(household);
        userRepository.save(user);

        // 4) FamilyMember (legacy)
        boolean hasMember = familyMemberRepository.findByUserId(user.getId()).isPresent();
        if (!hasMember) {
            FamilyMember familyMember = FamilyMember.builder()
                    .firstName(request.getFirstName())
                    .lastName(request.getLastName())
                    .phone(request.getPhone())
                    .role(FamilyRole.OTHER)
                    .user(user)
                    .familyGroup(familyGroup)
                    .scope(household)
                    .build();
            familyMemberRepository.save(familyMember);
        }

        log.info("User '{}' joined existing scope via invite code: clan={}, household={}",
                user.getUsername(), clan.getId(), household.getId());
    }

    /**
     * Auto-provisioning eski user'lar uchun: login paytida agar user'da
     * familyGroup yoki primaryScope yo'q bo'lsa, avtomatik yaratadi.
     * Bu V34 dan oldin ro'yxatdan o'tgan yoki migratsiya o'tkazib yuborilgan
     * user'larni ham yangi multi-scope tizimiga moslab beradi.
     */
    @Transactional
    public void ensureUserHasScope(User userParam) {
        if (userParam == null || userParam.getId() == null) return;
        // MUHIM: login paytida bu metod JWT autentifikatsiyadagi DETACHED user
        // bilan chaqirilishi mumkin. LAZY maydonlarga (familyGroup/primaryScope)
        // xavfsiz kirish uchun managed entity'ni repository'dan qayta yuklaymiz.
        User user = userRepository.findById(userParam.getId()).orElse(null);
        if (user == null) return;

        // Oila a'zosiga bog'langan user — uning aktiv scope'i HAR DOIM o'sha a'zo xonadoni
        // bilan mos bo'lishi kerak. Bu, jumladan, eski bug tufayli (admin login ochganda
        // primaryScope o'rnatilmagani sabab) noto'g'ri/bo'sh urug'ga tushib qolgan login'larni
        // keyingi kirishda avtomatik tuzatadi (self-heal) — migratsiyasiz.
        FamilyMember linkedMember = familyMemberRepository.findByUserId(user.getId()).orElse(null);
        if (linkedMember != null && linkedMember.getScope() != null) {
            reconcileUserScopeWithMember(user, linkedMember);
            return;
        }

        if (user.getFamilyGroup() != null && user.getPrimaryScope() != null) {
            return; // mustaqil user, scope to'liq
        }
        String displayName = user.getFullName() != null && !user.getFullName().isBlank()
                ? user.getFullName().trim()
                : user.getUsername();
        // Ism/familiyani ajratish (fullName'dan)
        String firstName = displayName;
        String lastName = "";
        if (displayName.contains(" ")) {
            String[] parts = displayName.split("\\s+", 2);
            firstName = parts[0];
            lastName = parts[1];
        }
        provisionScopeAndFamilyGroup(user, displayName, firstName, lastName);
        log.info("Auto-provisioned scope for legacy user: {}", user.getUsername());
    }

    /**
     * User'ning scope/familyGroup'ini bog'langan oila a'zosi xonadoniga moslaydi va kerakli
     * membership'larni ta'minlaydi. Mos bo'lsa — hech narsa o'zgartirmaydi (no-op).
     */
    private void reconcileUserScopeWithMember(User user, FamilyMember member) {
        Scope memberScope = member.getScope();
        Scope household = (memberScope.getType() == ScopeType.HOUSEHOLD)
                ? memberScope
                : scopeRepository
                        .findFirstByParentScopeIdAndTypeAndIsActiveTrue(memberScope.getId(), ScopeType.HOUSEHOLD)
                        .orElse(null);
        if (household == null) {
            return; // xonadon topilmadi — xavfsizlik uchun tegmaymiz
        }

        // Membership'lar (HOUSEHOLD + parent CLAN). Mavjud ACTIVE rol (masalan OWNER) saqlanadi.
        scopeMembershipService.attachToHousehold(household, user, ScopeRole.MEMBER);

        boolean changed = false;
        Long currentPrimaryId = user.getPrimaryScope() != null ? user.getPrimaryScope().getId() : null;
        if (!household.getId().equals(currentPrimaryId)) {
            user.setPrimaryScope(household);
            changed = true;
        }
        FamilyGroup memberFg = member.getFamilyGroup();
        Long currentFgId = user.getFamilyGroup() != null ? user.getFamilyGroup().getId() : null;
        if (memberFg != null && !memberFg.getId().equals(currentFgId)) {
            user.setFamilyGroup(memberFg);
            changed = true;
        }
        if (changed) {
            userRepository.save(user);
            log.info("User '{}' scope'i oila a'zosi xonadoniga moslandi (household={})",
                    user.getUsername(), household.getId());
        }
    }

    /**
     * Asosiy scope provisioning mantig'i — register va auto-provision ikkalasida ishlatiladi.
     */
    private void provisionScopeAndFamilyGroup(User user, String displayName,
                                               String firstName, String lastName) {

        // 1) FamilyGroup
        FamilyGroup familyGroup = FamilyGroup.builder()
                .name(displayName + " oilasi")
                .admin(user)
                .active(true)
                .build();
        familyGroup = familyGroupRepository.save(familyGroup);

        // 2) CLAN scope (parent=null) — unique code bilan (taklif uchun)
        Scope clan = Scope.builder()
                .type(ScopeType.CLAN)
                .name(displayName + " urug'i")
                .ownerUser(user)
                .uniqueCode(inviteCodeGenerator.generateForType(ScopeType.CLAN))
                .legacyFamilyGroup(familyGroup)
                .isActive(true)
                .build();
        clan = scopeRepository.save(clan);

        // 3) HOUSEHOLD scope (parent=clan) — unique code bilan
        Scope household = Scope.builder()
                .type(ScopeType.HOUSEHOLD)
                .name(displayName + " xonadoni")
                .parentScope(clan)
                .ownerUser(user)
                .uniqueCode(inviteCodeGenerator.generateForType(ScopeType.HOUSEHOLD))
                .displayCode(householdCodeGenerator.generate())
                .legacyFamilyGroup(familyGroup)
                .isActive(true)
                .build();
        household = scopeRepository.save(household);

        // 4) ScopeMembership x2 (clan + household, ikkalasida ham OWNER)
        LocalDateTime now = LocalDateTime.now();
        scopeMembershipRepository.save(ScopeMembership.builder()
                .scope(clan)
                .user(user)
                .role(ScopeRole.OWNER)
                .status(MembershipStatus.ACTIVE)
                .joinedAt(now)
                .build());
        scopeMembershipRepository.save(ScopeMembership.builder()
                .scope(household)
                .user(user)
                .role(ScopeRole.OWNER)
                .status(MembershipStatus.ACTIVE)
                .joinedAt(now)
                .build());

        // 5) User ni familyGroup va primaryScope (HOUSEHOLD) ga bog'lash
        user.setFamilyGroup(familyGroup);
        user.setPrimaryScope(household);
        userRepository.save(user);

        // 6) FamilyMember (legacy) — yangi familyGroup'ga biriktirib
        // Eski user'larda allaqachon familyMember bo'lishi mumkin (User.familyMember mavjud bo'lmasa).
        boolean hasMember = familyMemberRepository.findByUserId(user.getId()).isPresent();
        if (!hasMember) {
            FamilyMember familyMember = FamilyMember.builder()
                    .firstName(firstName != null ? firstName : displayName)
                    .lastName(lastName)
                    .phone(user.getPhone())
                    .role(FamilyRole.OTHER)
                    .user(user)
                    .familyGroup(familyGroup)
                    .scope(household)
                    .build();
            familyMemberRepository.save(familyMember);
        } else {
            // Mavjud familyMember'ga familyGroup biriktirish (agar yo'q bo'lsa)
            final FamilyGroup fgRef = familyGroup;
            familyMemberRepository.findByUserId(user.getId()).ifPresent(fm -> {
                if (fm.getFamilyGroup() == null) {
                    fm.setFamilyGroup(fgRef);
                    familyMemberRepository.save(fm);
                }
            });
        }
    }

    private String buildDisplayName(RegisterRequest request) {
        String last = request.getLastName() != null ? request.getLastName().trim() : "";
        String first = request.getFirstName() != null ? request.getFirstName().trim() : "";
        if (!last.isEmpty()) return last;
        if (!first.isEmpty()) return first;
        return request.getUsername();
    }

    private void validatePassword(String password) {
        if (password == null || password.length() < 6) {
            throw new IllegalArgumentException("Parol kamida 6 belgidan iborat bo'lishi kerak");
        }

        boolean hasUpper = password.chars().anyMatch(Character::isUpperCase);
        boolean hasLower = password.chars().anyMatch(Character::isLowerCase);
        boolean hasDigit = password.chars().anyMatch(Character::isDigit);

        if (!hasUpper || !hasLower || !hasDigit) {
            throw new IllegalArgumentException("Parol katta harf, kichik harf va raqam o'z ichiga olishi kerak");
        }
    }

    public JwtResponse login(LoginRequest request, String ipAddress, String userAgent) {
        String username = request.getUsername();

        // Check if account is locked due to too many failed attempts
        if (loginAttemptService.isAccountLocked(username)) {
            long remainingMinutes = loginAttemptService.getRemainingLockoutTime(username);

            // Log failed attempt
            loginAttemptService.logFailedAttempt(
                username,
                ipAddress,
                userAgent,
                LoginAttempt.FailureReason.ACCOUNT_LOCKED,
                "Account temporarily locked due to too many failed attempts. Try again in " + remainingMinutes + " minutes."
            );

            throw new AccountLockedException(
                "Akkaunt vaqtincha bloklandi. " + remainingMinutes + " daqiqadan so'ng urinib ko'ring."
            );
        }

        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.getUsername(),
                            request.getPassword()
                    )
            );

            SecurityContextHolder.getContext().setAuthentication(authentication);

            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
            Long userId = userDetails.getUser().getId();

            // Auto-provision: eski user'larga ham CLAN+HOUSEHOLD scope yaratamiz
            // agar mavjud bo'lmasa. Bu seamless UX ta'minlaydi — bir kelin
            // qoldirmaslik kerak.
            try {
                ensureUserHasScope(userDetails.getUser());
            } catch (Exception ex) {
                log.warn("ensureUserHasScope login paytida muvaffaqiyatsiz: {}", ex.getMessage());
            }

            // Generate token with permissions
            String accessToken = tokenProvider.generateStaffTokenWithPermissions(
                    userDetails.getUsername(),
                    userId,
                    userDetails.getRoleCodes(),
                    userDetails.getPermissions()
            );
            String refreshToken = tokenProvider.generateStaffRefreshToken(userDetails.getUsername(), userId);

            // Create session in database
            LocalDateTime expiresAt = LocalDateTime.now().plusSeconds(jwtExpiration / 1000);
            Session session = sessionService.createSession(
                userDetails.getUser(),
                accessToken,
                ipAddress,
                userAgent,
                expiresAt
            );

            // Log successful login attempt
            loginAttemptService.logSuccessfulAttempt(username, ipAddress, userAgent, session);

            // Check if user must change password
            Boolean mustChangePassword = Boolean.TRUE.equals(userDetails.getUser().getMustChangePassword());

            // Resolve familyMemberId
            Long familyMemberId = familyMemberRepository.findByUserId(userId)
                    .map(FamilyMember::getId)
                    .orElse(null);

            return JwtResponse.builder()
                    .accessToken(accessToken)
                    .refreshToken(refreshToken)
                    .user(UserResponse.from(userDetails.getUser(), familyMemberId))
                    .permissions(userDetails.getPermissions())
                    .roles(userDetails.getRoleCodes())
                    .requiresPasswordChange(mustChangePassword)
                    .build();

        } catch (BadCredentialsException e) {
            // Log failed login attempt
            User user = userRepository.findByUsername(username).orElse(null);
            LoginAttempt.FailureReason reason = user == null
                    ? LoginAttempt.FailureReason.USER_NOT_FOUND
                    : LoginAttempt.FailureReason.INVALID_PASSWORD;

            loginAttemptService.logFailedAttempt(
                username,
                ipAddress,
                userAgent,
                reason,
                "Invalid username or password"
            );

            throw new BadCredentialsException("Noto'g'ri foydalanuvchi nomi yoki parol");

        } catch (DisabledException e) {
            // Log failed login for disabled account
            loginAttemptService.logFailedAttempt(
                username,
                ipAddress,
                userAgent,
                LoginAttempt.FailureReason.ACCOUNT_DISABLED,
                "Account is disabled"
            );

            throw new AccountDisabledException("Akkaunt faol emas");
        }
    }

    public JwtResponse refreshToken(String refreshToken) {
        if (tokenProvider.validateToken(refreshToken)) {
            String username = tokenProvider.getUsernameFromToken(refreshToken);
            User user = userRepository.findByUsernameWithRolesAndPermissions(username)
                    .orElseThrow(() -> new ResourceNotFoundException("Foydalanuvchi", "username", username));

            CustomUserDetails userDetails = new CustomUserDetails(user);

            String newAccessToken = tokenProvider.generateStaffTokenWithPermissions(
                    username,
                    user.getId(),
                    userDetails.getRoleCodes(),
                    userDetails.getPermissions()
            );
            String newRefreshToken = tokenProvider.generateStaffRefreshToken(username, user.getId());

            Long familyMemberId = familyMemberRepository.findByUserId(user.getId())
                    .map(FamilyMember::getId)
                    .orElse(null);

            return JwtResponse.builder()
                    .accessToken(newAccessToken)
                    .refreshToken(newRefreshToken)
                    .user(UserResponse.from(user, familyMemberId))
                    .permissions(userDetails.getPermissions())
                    .roles(userDetails.getRoleCodes())
                    .build();
        }
        throw new BadRequestException("Refresh token yaroqsiz");
    }

    public UserResponse getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        User user = userDetails.getUser();

        Long familyMemberId = familyMemberRepository.findByUserId(user.getId())
                .map(FamilyMember::getId)
                .orElse(null);

        return UserResponse.from(user, familyMemberId);
    }
}
