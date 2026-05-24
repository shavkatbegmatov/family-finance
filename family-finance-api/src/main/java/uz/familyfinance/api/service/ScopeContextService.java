package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.entity.Scope;
import uz.familyfinance.api.entity.ScopeMembership;
import uz.familyfinance.api.entity.User;
import uz.familyfinance.api.enums.MembershipStatus;
import uz.familyfinance.api.enums.ScopeRole;
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
     * Joriy "aktiv" scope. Phase 1 da {@code User.primaryScope} qaytariladi.
     * Phase 2 da JWT'dagi {@code active_scope_id} ustun bo'ladi.
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
        User user = getCurrentUser();
        if (user.getPrimaryScope() != null) {
            return Optional.of(user.getPrimaryScope());
        }
        // Fallback: birinchi ACTIVE membership'dagi scope
        return membershipRepository.findByUserIdAndStatus(user.getId(), MembershipStatus.ACTIVE)
                .stream()
                .findFirst()
                .map(ScopeMembership::getScope);
    }

    public Long getActiveScopeId() {
        return getActiveScope().getId();
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
