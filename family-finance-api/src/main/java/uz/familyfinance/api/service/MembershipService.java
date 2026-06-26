package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.dto.request.MembershipInviteRequest;
import uz.familyfinance.api.dto.request.ScopeRoleUpdateRequest;
import uz.familyfinance.api.dto.response.MembershipResponse;
import uz.familyfinance.api.entity.FamilyGroup;
import uz.familyfinance.api.entity.FamilyMember;
import uz.familyfinance.api.entity.Scope;
import uz.familyfinance.api.entity.ScopeMembership;
import uz.familyfinance.api.entity.User;
import uz.familyfinance.api.enums.FamilyRole;
import uz.familyfinance.api.enums.MembershipStatus;
import uz.familyfinance.api.enums.ScopeRole;
import uz.familyfinance.api.enums.ScopeType;
import uz.familyfinance.api.exception.BadRequestException;
import uz.familyfinance.api.exception.ConflictException;
import uz.familyfinance.api.exception.ResourceNotFoundException;
import uz.familyfinance.api.repository.FamilyMemberRepository;
import uz.familyfinance.api.repository.ScopeMembershipRepository;
import uz.familyfinance.api.repository.ScopeRepository;
import uz.familyfinance.api.repository.UserRepository;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Scope membership boshqaruvi: taklif, rol o'zgartirish, chiqarib yuborish.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MembershipService {

    private final ScopeMembershipRepository membershipRepository;
    private final ScopeRepository scopeRepository;
    private final UserRepository userRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final ScopeContextService scopeContext;
    private final ScopeMembershipService scopeMembershipService;

    // ====================================================================
    // Read
    // ====================================================================

    @Transactional(readOnly = true)
    public List<MembershipResponse> listForScope(Long scopeId) {
        if (!scopeContext.canViewScope(scopeId)) {
            throw new AccessDeniedException("Sizda bu scope a'zolarini ko'rish ruxsati yo'q");
        }
        return membershipRepository.findByScopeIdAndStatus(scopeId, MembershipStatus.ACTIVE)
                .stream()
                .map(MembershipResponse::from)
                .collect(Collectors.toList());
    }

    // ====================================================================
    // Invite
    // ====================================================================

    @Transactional
    public MembershipResponse invite(Long scopeId, MembershipInviteRequest request) {
        Scope scope = scopeRepository.findById(scopeId)
                .orElseThrow(() -> new ResourceNotFoundException("Scope topilmadi: id=" + scopeId));

        if (!scopeContext.canManageScope(scopeId)) {
            throw new AccessDeniedException("Sizda bu scope'ga a'zo qo'shish ruxsati yo'q");
        }

        User targetUser = resolveTargetUser(request);

        // Taklifda PENDING status (user qabul qilishi kerak), yoki ACTIVE
        // (admin majburiy qo'shdi — masalan bola yoki vasiy uchun).
        boolean requireAcceptance = !Boolean.FALSE.equals(request.getRequireAcceptance());
        MembershipStatus targetStatus = requireAcceptance
                ? MembershipStatus.PENDING : MembershipStatus.ACTIVE;

        // Mavjud membership tekshiruvi — idempotent qayta taklif
        var existingOpt = membershipRepository.findByScopeIdAndUserId(scopeId, targetUser.getId());
        if (existingOpt.isPresent()) {
            ScopeMembership existing = existingOpt.get();
            if (existing.getStatus() == MembershipStatus.ACTIVE) {
                throw new ConflictException("Foydalanuvchi allaqachon bu scope a'zosi");
            }
            // PENDING/LEFT/EXPELLED → qayta taklif
            existing.setStatus(targetStatus);
            existing.setRole(request.getRole());
            existing.setInvitedBy(scopeContext.getCurrentUser());
            existing.setJoinedAt(java.time.LocalDateTime.now());
            ScopeMembership saved = membershipRepository.save(existing);
            log.info("Membership re-invited: scope={}, user={}, status={}",
                    scopeId, targetUser.getUsername(), targetStatus);
            return MembershipResponse.from(saved);
        }

        // Yangi membership
        ScopeMembership membership = ScopeMembership.builder()
                .scope(scope)
                .user(targetUser)
                .role(request.getRole())
                .status(targetStatus)
                .invitedBy(scopeContext.getCurrentUser())
                .build();
        membership = membershipRepository.save(membership);

        log.info("Membership created: scope={}, user={}, role={}, status={}, invitedBy={}",
                scopeId, targetUser.getUsername(), request.getRole(),
                targetStatus, scopeContext.getCurrentUserId());

        return MembershipResponse.from(membership);
    }

    private User resolveTargetUser(MembershipInviteRequest request) {
        if (request.getUserId() != null) {
            return userRepository.findById(request.getUserId())
                    .orElseThrow(() -> new ResourceNotFoundException("Foydalanuvchi topilmadi"));
        }
        if (request.getUsername() != null && !request.getUsername().isBlank()) {
            return userRepository.findByUsername(request.getUsername().trim())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Bunday usernameli foydalanuvchi topilmadi: " + request.getUsername()));
        }
        throw new BadRequestException("userId yoki username kiritilishi shart");
    }

    // ====================================================================
    // Accept / decline (foydalanuvchi tomonida)
    // ====================================================================

    /** Joriy user uchun kutilayotgan barcha takliflar. */
    @Transactional(readOnly = true)
    public List<MembershipResponse> myPendingInvitations() {
        Long userId = scopeContext.getCurrentUserId();
        if (userId == null) return List.of();
        return membershipRepository.findByUserIdAndStatus(userId, MembershipStatus.PENDING)
                .stream().map(MembershipResponse::from).collect(Collectors.toList());
    }

    /** Joriy user taklifni qabul qiladi. */
    @Transactional
    public MembershipResponse acceptInvitation(Long membershipId) {
        ScopeMembership membership = membershipRepository.findById(membershipId)
                .orElseThrow(() -> new ResourceNotFoundException("Taklif topilmadi"));
        Long userId = scopeContext.getCurrentUserId();
        if (userId == null || !membership.getUser().getId().equals(userId)) {
            throw new AccessDeniedException("Bu taklif sizniki emas");
        }
        if (membership.getStatus() != MembershipStatus.PENDING) {
            throw new BadRequestException("Faqat PENDING taklifni qabul qilish mumkin");
        }
        membership.setStatus(MembershipStatus.ACTIVE);
        membership.setJoinedAt(java.time.LocalDateTime.now());
        membershipRepository.save(membership);

        log.info("Membership accepted: id={}, user={}, scope={}",
                membershipId, membership.getUser().getUsername(), membership.getScope().getId());
        return MembershipResponse.from(membership);
    }

    /** Joriy user taklifni rad etadi. */
    @Transactional
    public void declineInvitation(Long membershipId) {
        ScopeMembership membership = membershipRepository.findById(membershipId)
                .orElseThrow(() -> new ResourceNotFoundException("Taklif topilmadi"));
        Long userId = scopeContext.getCurrentUserId();
        if (userId == null || !membership.getUser().getId().equals(userId)) {
            throw new AccessDeniedException("Bu taklif sizniki emas");
        }
        if (membership.getStatus() != MembershipStatus.PENDING) {
            throw new BadRequestException("Faqat PENDING taklifni rad etish mumkin");
        }
        membership.setStatus(MembershipStatus.LEFT);
        membershipRepository.save(membership);

        log.info("Membership declined: id={}, user={}", membershipId,
                membership.getUser().getUsername());
    }

    // ====================================================================
    // Leave (user o'zi chiqishi)
    // ====================================================================

    // ====================================================================
    // Join by invite code (logged-in user)
    // ====================================================================

    /**
     * Login qilingan user invite code orqali boshqa oilaga MEMBER bo'lib qo'shiladi.
     * <p>Eski auto-yaratilgan clan'i bo'sh va u yagona OWNER bo'lsa — arxivlanadi.</p>
     */
    @Transactional
    public MembershipResponse joinByCode(String inviteCode, boolean archiveOldClan) {
        // MUHIM: scopeContext.getCurrentUser() JWT autentifikatsiyada yuklangan
        // DETACHED User qaytaradi — uning LAZY maydonlari (primaryScope, familyGroup)
        // ga kirsak LazyInitializationException bo'ladi. Shu sabab repository'dan
        // qayta yuklaymiz (managed entity).
        Long currentUserId = scopeContext.getCurrentUserId();
        if (currentUserId == null) {
            throw new AccessDeniedException("Autentifikatsiya kerak");
        }
        User user = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Foydalanuvchi topilmadi"));
        Scope target = scopeRepository.findByUniqueCode(inviteCode)
                .filter(s -> Boolean.TRUE.equals(s.getIsActive()))
                .orElseThrow(() -> new BadRequestException(
                        "Taklif kodi noto'g'ri yoki bekor qilingan: " + inviteCode));

        // CLAN va HOUSEHOLD aniqlash (registratsiyadagi mantiq bilan bir xil)
        Scope clan;
        Scope household;
        if (target.getType() == ScopeType.CLAN) {
            clan = target;
            household = scopeRepository.findFirstByParentScopeIdAndTypeAndIsActiveTrue(
                    clan.getId(), ScopeType.HOUSEHOLD)
                    .orElseThrow(() -> new BadRequestException(
                            "Bu urug'da hech qanday faol xonadon topilmadi"));
        } else if (target.getType() == ScopeType.HOUSEHOLD) {
            household = target;
            clan = target.getParentScope();
            if (clan == null || clan.getType() != ScopeType.CLAN) {
                throw new BadRequestException("Xonadon tegishli urug'ga ulanmagan");
            }
        } else {
            throw new BadRequestException(
                    "Bu kod orqali qo'shilish faqat CLAN/HOUSEHOLD uchun mumkin");
        }

        // Mavjud auto-yaratilgan clan'ni arxivlash (agar so'ralgan bo'lsa)
        if (archiveOldClan) {
            archiveUserEmptyOldClan(user);
        }

        // CLAN'ga MEMBER bo'lib qo'shish
        ensureMembership(clan, user, ScopeRole.MEMBER);
        // HOUSEHOLD'ga MEMBER bo'lib qo'shish va asosiy ScopeMembership'ni saqlash
        ScopeMembership newHouseholdMembership = ensureMembership(household, user, ScopeRole.MEMBER);

        // User'ning primaryScope va familyGroup ni yangilash
        user.setPrimaryScope(household);
        FamilyGroup fg = clan.getLegacyFamilyGroup();
        if (fg != null) {
            user.setFamilyGroup(fg);
            // MUHIM: user'ning FamilyMember (genealogiya/a'zo) yozuvini ham yangi
            // family_group'ga ko'chiramiz — aks holda /my-family va /family
            // sahifalarida ko'rinmaydi (ular FamilyMember.family_group bo'yicha filtr qiladi).
            moveOrCreateFamilyMember(user, fg);
        }
        userRepository.save(user);

        log.info("User {} joined scope via code: clan={}, household={}",
                user.getUsername(), clan.getId(), household.getId());

        return MembershipResponse.from(newHouseholdMembership);
    }

    /**
     * User'ning FamilyMember yozuvini berilgan family_group'ga ko'chiradi.
     * Mavjud bo'lsa — family_group'ni yangilaydi; bo'lmasa — yangi yaratadi.
     * Bu user yangi oilaning a'zolar ro'yxatida ko'rinishini ta'minlaydi.
     */
    private void moveOrCreateFamilyMember(User user, FamilyGroup targetGroup) {
        familyMemberRepository.findByUserId(user.getId()).ifPresentOrElse(
                member -> {
                    member.setFamilyGroup(targetGroup);
                    familyMemberRepository.save(member);
                    log.info("Moved FamilyMember {} to family group {}",
                            member.getId(), targetGroup.getId());
                },
                () -> {
                    // Ism/familiyani user.fullName'dan ajratamiz
                    String fullName = user.getFullName() != null ? user.getFullName().trim() : user.getUsername();
                    String firstName = fullName;
                    String lastName = "";
                    if (fullName.contains(" ")) {
                        String[] parts = fullName.split("\\s+", 2);
                        // fullName odatda "Familiya Ism" formatida — lekin xavfsizlik uchun ikkalasini ham saqlaymiz
                        firstName = parts[1];
                        lastName = parts[0];
                    }
                    FamilyMember member = FamilyMember.builder()
                            .firstName(firstName)
                            .lastName(lastName)
                            .role(FamilyRole.OTHER)
                            .user(user)
                            .familyGroup(targetGroup)
                            .isActive(true)
                            .build();
                    familyMemberRepository.save(member);
                    log.info("Created FamilyMember for user {} in family group {}",
                            user.getUsername(), targetGroup.getId());
                });
    }

    /**
     * Invite (kod orqali qo'shilish) uchun upsert: yo'q bo'lsa ACTIVE yaratadi, INACTIVE/PENDING
     * bo'lsa ACTIVE'ga o'tkazib {@code joinedAt}'ni yangilaydi, ACTIVE bo'lsa tegmaydi.
     *
     * <p>DRY: yagona upsert mantig'i {@link ScopeMembershipService#addMembershipIfAbsent} da.
     * Bu yerda {@code refreshJoinedAtOnReactivate=true} — qayta qo'shilishda {@code joinedAt}
     * yangilanadi (eski xulq AYNAN saqlanadi).</p>
     */
    private ScopeMembership ensureMembership(Scope scope, User user, ScopeRole role) {
        return scopeMembershipService.addMembershipIfAbsent(scope, user, role, true);
    }

    /**
     * User o'z auto-yaratilgan eski clan'idan tushib qoladi va u bo'sh qolsa
     * (faqat o'zi a'zo edi va boshqa transactional ma'lumot yo'q) — clan'ni
     * arxivlash (is_active=false).
     */
    private void archiveUserEmptyOldClan(User user) {
        Scope oldHousehold = user.getPrimaryScope();
        if (oldHousehold == null) return;

        Scope oldClan = oldHousehold.getType() == ScopeType.CLAN
                ? oldHousehold
                : oldHousehold.getParentScope();
        if (oldClan == null || oldClan.getType() != ScopeType.CLAN) return;

        long otherMembers = membershipRepository
                .findByScopeIdAndStatus(oldClan.getId(), MembershipStatus.ACTIVE).stream()
                .filter(m -> !m.getUser().getId().equals(user.getId()))
                .count();
        if (otherMembers > 0) return; // Boshqa a'zolar bor — arxivlamaymiz

        // User'ning eski membership'larini LEFT qilamiz
        membershipRepository.findByScopeIdAndUserId(oldClan.getId(), user.getId())
                .ifPresent(m -> { m.setStatus(MembershipStatus.LEFT); membershipRepository.save(m); });
        membershipRepository.findByScopeIdAndUserId(oldHousehold.getId(), user.getId())
                .ifPresent(m -> { m.setStatus(MembershipStatus.LEFT); membershipRepository.save(m); });

        // Scope'larni inactive qilamiz (data o'chmaydi, faqat ko'rinmaydi)
        oldClan.setIsActive(false);
        scopeRepository.save(oldClan);
        if (oldHousehold.getType() != ScopeType.CLAN) {
            oldHousehold.setIsActive(false);
            scopeRepository.save(oldHousehold);
        }

        log.info("Archived empty auto-created clan {} (user {} left)",
                oldClan.getId(), user.getUsername());
    }

    @Transactional
    public void leaveScope(Long scopeId) {
        Long userId = scopeContext.getCurrentUserId();
        if (userId == null) {
            throw new AccessDeniedException("Autentifikatsiya kerak");
        }
        ScopeMembership membership = membershipRepository.findByScopeIdAndUserId(scopeId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Membership topilmadi"));

        // Oxirgi OWNER chiqib keta olmaydi — avval boshqa OWNER tayinlash kerak
        if (membership.getRole() == ScopeRole.OWNER) {
            long otherOwners = membershipRepository.findByScopeIdAndRole(scopeId, ScopeRole.OWNER)
                    .stream().filter(m -> !m.getUser().getId().equals(userId)).count();
            if (otherOwners == 0) {
                throw new ConflictException(
                        "Siz yagona OWNER'siz. Avval boshqasini OWNER qiling yoki scope'ni o'chiring.");
            }
        }

        membership.setStatus(MembershipStatus.LEFT);
        membershipRepository.save(membership);

        log.info("User {} left scope {}", userId, scopeId);
    }

    // ====================================================================
    // Update role
    // ====================================================================

    @Transactional
    public MembershipResponse updateRole(Long scopeId, Long userId, ScopeRoleUpdateRequest request) {
        if (!scopeContext.canManageScope(scopeId)) {
            throw new AccessDeniedException("Sizda rollarni o'zgartirish ruxsati yo'q");
        }

        ScopeMembership membership = membershipRepository.findByScopeIdAndUserId(scopeId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Membership topilmadi"));

        if (membership.getStatus() != MembershipStatus.ACTIVE) {
            throw new BadRequestException("Faqat ACTIVE membership rolini o'zgartirish mumkin");
        }

        ScopeRole oldRole = membership.getRole();
        membership.setRole(request.getRole());
        membership = membershipRepository.save(membership);

        // Agar OWNER'dan kichik rolga tushirilayotgan bo'lsa, kamida 1 OWNER qoldiq tekshiruvi
        if (oldRole == ScopeRole.OWNER && request.getRole() != ScopeRole.OWNER) {
            long ownersLeft = membershipRepository.findByScopeIdAndRole(scopeId, ScopeRole.OWNER).size();
            if (ownersLeft == 0) {
                throw new ConflictException("Kamida 1 OWNER qolishi kerak");
            }
        }

        log.info("Membership role changed: scope={}, user={}, from {} to {}",
                scopeId, userId, oldRole, request.getRole());

        return MembershipResponse.from(membership);
    }

    // ====================================================================
    // Remove
    // ====================================================================

    @Transactional
    public void remove(Long scopeId, Long userId) {
        if (!scopeContext.canManageScope(scopeId)) {
            throw new AccessDeniedException("Sizda a'zolarni chiqarib yuborish ruxsati yo'q");
        }

        ScopeMembership membership = membershipRepository.findByScopeIdAndUserId(scopeId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Membership topilmadi"));

        // Oxirgi OWNER'ni o'chirib bo'lmaydi
        if (membership.getRole() == ScopeRole.OWNER) {
            long ownerCount = membershipRepository.findByScopeIdAndRole(scopeId, ScopeRole.OWNER).size();
            if (ownerCount <= 1) {
                throw new ConflictException("Oxirgi OWNER'ni chiqarib bo'lmaydi");
            }
        }

        membership.setStatus(MembershipStatus.EXPELLED);
        membershipRepository.save(membership);

        log.info("Membership removed (EXPELLED): scope={}, user={}, by={}",
                scopeId, userId, scopeContext.getCurrentUserId());
    }
}
