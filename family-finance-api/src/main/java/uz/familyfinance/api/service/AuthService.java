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
    private final PasswordEncoder passwordEncoder;
    private final SessionService sessionService;
    private final LoginAttemptService loginAttemptService;
    private final AuditLogService auditLogService;

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

        // YANGI: Avtomatik FamilyGroup + CLAN + HOUSEHOLD scope yaratish.
        // Bu yangi user uchun izolyatsiyalangan moliyaviy makonni ta'minlaydi —
        // shu yo'l bilan boshqa user'larning tranzaksiyalari/balanslari ko'rinmaydi.
        provisionInitialScopeFor(user, request);

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
     * Auto-provisioning eski user'lar uchun: login paytida agar user'da
     * familyGroup yoki primaryScope yo'q bo'lsa, avtomatik yaratadi.
     * Bu V34 dan oldin ro'yxatdan o'tgan yoki migratsiya o'tkazib yuborilgan
     * user'larni ham yangi multi-scope tizimiga moslab beradi.
     */
    @Transactional
    public void ensureUserHasScope(User user) {
        if (user == null) return;
        if (user.getFamilyGroup() != null && user.getPrimaryScope() != null) {
            return; // hammasi joyida
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

        // 2) CLAN scope (parent=null)
        Scope clan = Scope.builder()
                .type(ScopeType.CLAN)
                .name(displayName + " urug'i")
                .ownerUser(user)
                .legacyFamilyGroup(familyGroup)
                .isActive(true)
                .build();
        clan = scopeRepository.save(clan);

        // 3) HOUSEHOLD scope (parent=clan)
        Scope household = Scope.builder()
                .type(ScopeType.HOUSEHOLD)
                .name(displayName + " xonadoni")
                .parentScope(clan)
                .ownerUser(user)
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
                    .role(FamilyRole.OTHER)
                    .user(user)
                    .familyGroup(familyGroup)
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
