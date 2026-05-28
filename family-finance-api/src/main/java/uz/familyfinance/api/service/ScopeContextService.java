package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.entity.FamilyGroup;
import uz.familyfinance.api.entity.Scope;
import uz.familyfinance.api.entity.ScopeMembership;
import uz.familyfinance.api.entity.User;
import uz.familyfinance.api.enums.MembershipStatus;
import uz.familyfinance.api.enums.ScopeRole;
import uz.familyfinance.api.enums.ScopeType;
import uz.familyfinance.api.exception.ResourceNotFoundException;
import uz.familyfinance.api.repository.ScopeMembershipRepository;
import uz.familyfinance.api.repository.ScopeRepository;
import uz.familyfinance.api.security.CustomUserDetails;

import java.util.Collections;
import java.util.Optional;
import java.util.Set;

/**
 * Markazlashtirilgan scope-scoping servisi.
 *
 * <p>Phase 1 da {@code getActiveScope()} joriy user'ning {@code primaryScope} dan
 * o'qiydi (JWT'da hali {@code active_scope_id} claim yo'q — Phase 2'da qo'shiladi).</p>
 *
 * <p>Bu servis kelajakda eski {@code PointConfigService.getCurrentFamilyGroup()}
 * o'rnini bosadi: Phase 2'da barcha 31+ chaqiruv shu yerga ko'chiriladi.</p>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ScopeContextService {

    private final ScopeRepository scopeRepository;
    private final ScopeMembershipRepository membershipRepository;

    // ====================================================================
    // Joriy user identifikatsiyasi
    // ====================================================================

    /** SecurityContext'dan joriy user details'ni oladi. Authenticated bo'lmasa null. */
    public CustomUserDetails getCurrentUserDetails() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return null;
        }
        Object principal = auth.getPrincipal();
        return principal instanceof CustomUserDetails details ? details : null;
    }

    public Long getCurrentUserId() {
        CustomUserDetails details = getCurrentUserDetails();
        return details != null ? details.getUser().getId() : null;
    }

    public User getCurrentUser() {
        CustomUserDetails details = getCurrentUserDetails();
        if (details == null) {
            throw new ResourceNotFoundException("Foydalanuvchi autentifikatsiyadan o'tmagan");
        }
        return details.getUser();
    }

    // ====================================================================
    // Aktiv scope
    // ====================================================================

    /**
     * Joriy "aktiv" scope. Phase 2 da quyidagi tartibda olinadi:
     * <ol>
     *   <li>JWT'dagi {@code activeScopeId} (CustomUserDetails.activeScopeId)</li>
     *   <li>Fallback: {@code User.primaryScope}</li>
     *   <li>Fallback: birinchi ACTIVE membership scope'i</li>
     * </ol>
     *
     * @throws ResourceNotFoundException agar user hech qanday scope'ga a'zo bo'lmasa
     */
    @Transactional(readOnly = true)
    public Scope getActiveScope() {
        return getActiveScopeOptional().orElseThrow(
            () -> new ResourceNotFoundException(
                "Sizning aktiv scope'ingiz aniqlanmadi. Iltimos, scope yarating yoki taklif qabul qiling."
            )
        );
    }

    @Transactional(readOnly = true)
    public Optional<Scope> getActiveScopeOptional() {
        CustomUserDetails details = getCurrentUserDetails();
        if (details == null) {
            return Optional.empty();
        }

        // 1) JWT'dan kelgan activeScopeId (eng yuqori prioritet)
        Long jwtActiveScopeId = details.getActiveScopeId();
        if (jwtActiveScopeId != null) {
            Optional<Scope> fromJwt = scopeRepository.findById(jwtActiveScopeId);
            if (fromJwt.isPresent()) {
                return fromJwt;
            }
        }

        // 2) Fallback: User.primaryScope
        User user = details.getUser();
        if (user.getPrimaryScope() != null) {
            return Optional.of(user.getPrimaryScope());
        }

        // 3) Fallback: birinchi ACTIVE membership'dagi scope
        return membershipRepository.findByUserIdAndStatus(user.getId(), MembershipStatus.ACTIVE)
                .stream()
                .findFirst()
                .map(ScopeMembership::getScope);
    }

    public Long getActiveScopeId() {
        return getActiveScope().getId();
    }

    // ====================================================================
    // Legacy family_group bridge (Phase 2 transition helper)
    // ====================================================================

    /**
     * Aktiv scope ga mos asl {@link FamilyGroup} ni qaytaradi.
     *
     * <p>HOUSEHOLD scope'da bo'lsak, parent CLAN orqali boramiz.
     * CLAN scope'da bo'lsak, {@code Scope.legacyFamilyGroup} dan o'qiymiz.</p>
     *
     * <p>Yangi yaratilgan (V34 dan keyin) scope'lar uchun null bo'lishi mumkin —
     * bu vaziyatda chaqiruvchi servis o'zining xato logikasini ishlatadi.</p>
     */
    @Transactional(readOnly = true)
    public Optional<FamilyGroup> getActiveFamilyGroupOptional() {
        return getActiveScopeOptional().flatMap(this::resolveFamilyGroup);
    }

    /**
     * Aktiv scope ga mos asl FamilyGroup ni qaytaradi yoki xato.
     *
     * <p>{@link PointConfigService#getCurrentFamilyGroup()} ning yangi
     * implementatsiyasi shu metoddan foydalanadi.</p>
     */
    @Transactional(readOnly = true)
    public FamilyGroup getActiveFamilyGroup() {
        return getActiveFamilyGroupOptional().orElseThrow(
            () -> new ResourceNotFoundException(
                "Joriy aktiv scope hech bir family_group ga bog'lanmagan. "
                + "Yangi scope yaratganingizda bunday holat yuz beradi — eski "
                + "Points tizimi bu scope'da hali ishlamaydi."
            )
        );
    }

    private Optional<FamilyGroup> resolveFamilyGroup(Scope scope) {
        Scope clanScope = (scope.getType() == ScopeType.CLAN)
                ? scope
                : scope.getParentScope();
        if (clanScope == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(clanScope.getLegacyFamilyGroup());
    }

    // ====================================================================
    // Visibility — qaysi scope'larni ko'ra oladi
    // ====================================================================

    /**
     * Joriy user ko'rishi mumkin bo'lgan barcha scope ID'lari.
     * SUPER_ADMIN bo'lsa, barcha scope'lar qaytariladi.
     */
    @Transactional(readOnly = true)
    public Set<Long> getVisibleScopeIds() {
        if (isSuperAdmin()) {
            // SUPER_ADMIN hamma narsani ko'radi — alohida flag sifatida belgilab,
            // chaqiruvchi servisda "if isSuperAdmin then skip filter" qilish samaraliroq
            return scopeRepository.findAll().stream()
                    .map(Scope::getId)
                    .collect(java.util.stream.Collectors.toSet());
        }
        Long userId = getCurrentUserId();
        if (userId == null) {
            return Collections.emptySet();
        }
        return scopeRepository.findVisibleScopeIdsForUser(userId);
    }

    /**
     * Boshqarish (manage) mumkin bo'lgan scope ID'lari — OWNER yoki ADMIN.
     * SUPER_ADMIN bo'lsa hammasi.
     */
    @Transactional(readOnly = true)
    public Set<Long> getManageableScopeIds() {
        if (isSuperAdmin()) {
            return scopeRepository.findAll().stream()
                    .map(Scope::getId)
                    .collect(java.util.stream.Collectors.toSet());
        }
        Long userId = getCurrentUserId();
        if (userId == null) {
            return Collections.emptySet();
        }
        return scopeRepository.findManageableScopeIdsForUser(userId);
    }

    // ====================================================================
    // Permission checks
    // ====================================================================

    /** Joriy user shu scope'da OWNER yoki ADMIN'mi? */
    public boolean canManageScope(Long scopeId) {
        if (isSuperAdmin()) return true;
        return getManageableScopeIds().contains(scopeId);
    }

    /** Joriy user shu scope'da kamida MEMBER (yozish huquqi) bormi? */
    @Transactional(readOnly = true)
    public boolean canWriteToScope(Long scopeId) {
        if (isSuperAdmin()) return true;
        Long userId = getCurrentUserId();
        if (userId == null) return false;
        return membershipRepository.findActiveRole(scopeId, userId)
                .map(ScopeRole::canWrite)
                .orElse(false);
    }

    /** Joriy user shu scope'ni ko'ra oladimi (kamida VIEWER)? */
    public boolean canViewScope(Long scopeId) {
        if (isSuperAdmin()) return true;
        return getVisibleScopeIds().contains(scopeId);
    }

    // ====================================================================
    // SUPER_ADMIN
    // ====================================================================

    public boolean isSuperAdmin() {
        CustomUserDetails details = getCurrentUserDetails();
        return details != null && Boolean.TRUE.equals(details.getUser().getIsSuperAdmin());
    }
}
