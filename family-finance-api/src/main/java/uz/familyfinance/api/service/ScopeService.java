package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.dto.request.ScopeCreateRequest;
import uz.familyfinance.api.dto.response.ScopeResponse;
import uz.familyfinance.api.entity.Scope;
import uz.familyfinance.api.entity.ScopeMembership;
import uz.familyfinance.api.entity.User;
import uz.familyfinance.api.enums.MembershipStatus;
import uz.familyfinance.api.enums.ScopeRole;
import uz.familyfinance.api.enums.ScopeType;
import uz.familyfinance.api.exception.BadRequestException;
import uz.familyfinance.api.exception.ResourceNotFoundException;
import uz.familyfinance.api.repository.ScopeMembershipRepository;
import uz.familyfinance.api.repository.ScopeRepository;
import uz.familyfinance.api.util.HouseholdCodeGenerator;
import uz.familyfinance.api.util.InviteCodeGenerator;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Scope CRUD va lifecycle servisi.
 *
 * <p>Yangi scope yaratilganda:
 * <ul>
 *   <li>Yaratuvchi avtomatik OWNER bo'lib qo'shiladi (membership)</li>
 *   <li>Unique code generatsiya qilinadi</li>
 *   <li>Type-specific validatsiya qilinadi (parent talab, masalan)</li>
 * </ul></p>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ScopeService {

    private final ScopeRepository scopeRepository;
    private final ScopeMembershipRepository membershipRepository;
    private final ScopeContextService scopeContext;
    private final InviteCodeGenerator inviteCodeGenerator;
    private final HouseholdCodeGenerator householdCodeGenerator;

    // ====================================================================
    // List & get
    // ====================================================================

    /** Joriy user ko'ra oladigan barcha scope'lar (ScopeSwitcher uchun). */
    @Transactional(readOnly = true)
    public List<ScopeResponse> getMyScopes() {
        Long userId = scopeContext.getCurrentUserId();
        if (userId == null) {
            return List.of();
        }
        // Optimallashtirish: membership orqali olamiz (faqat o'zi a'zo bo'lganlari)
        List<ScopeMembership> memberships = membershipRepository.findByUserIdAndStatus(
                userId, MembershipStatus.ACTIVE);

        return memberships.stream()
                .map(m -> {
                    ScopeResponse r = ScopeResponse.from(m.getScope());
                    r.setCurrentUserRole(m.getRole());
                    return r;
                })
                .collect(Collectors.toList());
    }

    /**
     * SUPER_ADMIN uchun — platformadagi BARCHA scope'lar (nazorat ro'yxati).
     * Har bir scope'ga faol a'zolar soni qo'shiladi. Faqat {@code @RequiresSuperAdmin}
     * endpoint'idan chaqiriladi.
     */
    @Transactional(readOnly = true)
    public List<ScopeResponse> getAllScopes() {
        return scopeRepository.findAll().stream()
                .map(scope -> {
                    ScopeResponse r = ScopeResponse.from(scope);
                    r.setMemberCount(membershipRepository.countByScopeIdAndStatus(
                            scope.getId(), MembershipStatus.ACTIVE));
                    return r;
                })
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ScopeResponse getById(Long id) {
        Scope scope = findScopeOrThrow(id);
        if (!scopeContext.canViewScope(id)) {
            throw new AccessDeniedException("Sizda bu scope'ni ko'rish ruxsati yo'q");
        }
        ScopeResponse r = ScopeResponse.from(scope);
        Long userId = scopeContext.getCurrentUserId();
        if (userId != null) {
            membershipRepository.findActiveRole(id, userId).ifPresent(r::setCurrentUserRole);
        }
        r.setMemberCount(membershipRepository.countByScopeIdAndStatus(id, MembershipStatus.ACTIVE));
        return r;
    }

    // ====================================================================
    // Create
    // ====================================================================

    @Transactional
    public ScopeResponse create(ScopeCreateRequest request) {
        validateCreateRequest(request);

        User currentUser = scopeContext.getCurrentUser();
        Scope parent = resolveAndValidateParent(request);

        Scope scope = Scope.builder()
                .type(request.getType())
                .name(request.getName().trim())
                .parentScope(parent)
                .ownerUser(currentUser)
                .uniqueCode(inviteCodeGenerator.generateForType(request.getType()))
                .displayCode(request.getType() == ScopeType.HOUSEHOLD ? householdCodeGenerator.generate() : null)
                .metadata(request.getMetadata())
                .startsAt(request.getStartsAt())
                .endsAt(request.getEndsAt())
                .isActive(true)
                .build();

        scope = scopeRepository.save(scope);

        // Yaratuvchi avtomatik OWNER
        ScopeMembership ownerMembership = ScopeMembership.builder()
                .scope(scope)
                .user(currentUser)
                .role(ScopeRole.OWNER)
                .status(MembershipStatus.ACTIVE)
                .invitedBy(null)
                .build();
        membershipRepository.save(ownerMembership);

        log.info("Scope created: type={}, id={}, name='{}', owner={}",
                scope.getType(), scope.getId(), scope.getName(), currentUser.getUsername());

        return ScopeResponse.from(scope);
    }

    private void validateCreateRequest(ScopeCreateRequest request) {
        if (request.getType().requiresParent() && request.getParentScopeId() == null) {
            throw new BadRequestException(request.getType() + " uchun parent scope majburiy");
        }
        if (!request.getType().requiresParent() && request.getParentScopeId() != null) {
            throw new BadRequestException("CLAN scope uchun parent bo'lishi mumkin emas");
        }
        if (request.getEndsAt() != null && request.getStartsAt() != null
                && request.getEndsAt().isBefore(request.getStartsAt())) {
            throw new BadRequestException("Tugash sanasi boshlanish sanasidan oldin bo'la olmaydi");
        }
    }

    private Scope resolveAndValidateParent(ScopeCreateRequest request) {
        if (request.getParentScopeId() == null) {
            return null;
        }
        Scope parent = findScopeOrThrow(request.getParentScopeId());

        // Faqat CLAN ostida HOUSEHOLD bo'lishi mumkin
        if (request.getType() == ScopeType.HOUSEHOLD && parent.getType() != ScopeType.CLAN) {
            throw new BadRequestException("HOUSEHOLD faqat CLAN ostida yaratilishi mumkin");
        }

        // Boshqaruv ruxsati tekshiruvi
        if (!scopeContext.canManageScope(parent.getId())) {
            throw new AccessDeniedException(
                    "Sizda parent scope'da yangi sub-scope yaratish ruxsati yo'q");
        }
        return parent;
    }

    // ====================================================================
    // Invite code
    // ====================================================================

    /** Scope egasi/admin'i o'z scope'ining hozirgi taklif kodini ko'rishi. */
    @Transactional(readOnly = true)
    public String getInviteCode(Long scopeId) {
        Scope scope = findScopeOrThrow(scopeId);
        if (!scopeContext.canManageScope(scopeId)) {
            throw new AccessDeniedException("Sizda bu scope kodi ko'rish ruxsati yo'q");
        }
        return scope.getUniqueCode();
    }

    /**
     * Kodi yo'q scope uchun kod yaratish yoki mavjudini yangilash. Eski kod
     * bilan kelgan har qanday taklif buziladi — bu xavfsizlik vositasidir.
     */
    @Transactional
    public String regenerateInviteCode(Long scopeId) {
        Scope scope = findScopeOrThrow(scopeId);
        if (!scopeContext.canManageScope(scopeId)) {
            throw new AccessDeniedException("Sizda bu kodi yangilash ruxsati yo'q");
        }
        String newCode = inviteCodeGenerator.generateForType(scope.getType());
        scope.setUniqueCode(newCode);
        scopeRepository.save(scope);
        log.info("Invite code regenerated for scope {} by user {}",
                scopeId, scopeContext.getCurrentUserId());
        return newCode;
    }

    /** Kodga ko'ra ma'lumot olish (registratsiya UI'da preview uchun). */
    @Transactional(readOnly = true)
    public ScopeResponse lookupByCode(String code) {
        Scope scope = scopeRepository.findByUniqueCode(code)
                .filter(s -> Boolean.TRUE.equals(s.getIsActive()))
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Bunday taklif kodi topilmadi yoki bekor qilingan"));
        // Faqat bazaviy ma'lumot: nom va turi — sezgir narsa qaytarmaymiz
        return ScopeResponse.from(scope);
    }

    // ====================================================================
    // Lifecycle
    // ====================================================================

    @Transactional
    public void deactivate(Long id) {
        Scope scope = findScopeOrThrow(id);
        if (!scopeContext.canManageScope(id)) {
            throw new AccessDeniedException("Sizda bu scope'ni o'chirish ruxsati yo'q");
        }
        // Faqat OWNER scope'ni o'chira oladi
        Long userId = scopeContext.getCurrentUserId();
        if (!scopeContext.isSuperAdmin()) {
            ScopeRole role = membershipRepository.findActiveRole(id, userId).orElse(null);
            if (role != ScopeRole.OWNER) {
                throw new AccessDeniedException("Faqat OWNER scope'ni o'chira oladi");
            }
        }
        scope.setIsActive(false);
        scopeRepository.save(scope);
        log.info("Scope deactivated: id={}, by userId={}", id, userId);
    }

    // ====================================================================
    // Helpers
    // ====================================================================

    Scope findScopeOrThrow(Long id) {
        return scopeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Scope topilmadi: id=" + id));
    }
}
