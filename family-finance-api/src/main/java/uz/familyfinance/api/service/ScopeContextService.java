package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
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
 * <p>Points endi bevosita scope bilan ishlaydi (ADR-002 P1);
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

    /**
     * Aktiv scope ID yoki {@code null} (aktiv scope aniqlanmasa).
     *
     * <p>{@link #getActiveScopeId()} dan farqli — exception tashlamaydi.
     * Yangi yoki scope tanlanmagan user'lar uchun read-only ro'yxat/KPI
     * so'rovlarida bo'sh natija qaytarish uchun ishlatiladi.</p>
     */
    @Transactional(readOnly = true)
    public Long getActiveScopeIdOrNull() {
        return getActiveScopeOptional().map(Scope::getId).orElse(null);
    }

    // ====================================================================
    // Genealogik tenant (FamilyGroup) resolution
    // ====================================================================

    /**
     * Aktiv scope tegishli oilaning genealogik tenant'ini ({@link FamilyGroup}) qaytaradi.
     *
     * <p>ADR-001 F5: {@code Scope} endi FamilyGroup'ga FK saqlamaydi (V55 DROP) — tenant
     * scope EGASI orqali aniqlanadi: {@code scope.ownerUser.familyGroup}. Bu V34
     * migratsiyasi (clan.owner = fg.admin) va provisioning (user o'z fg'i bilan xonadon
     * egasi) invariantiga tayanadi.</p>
     */
    @Transactional(readOnly = true)
    public Optional<FamilyGroup> getActiveFamilyGroupOptional() {
        return getActiveScopeOptional().flatMap(this::resolveFamilyGroup);
    }

    /**
     * Aktiv scope ga mos genealogik tenant yoki xato.
     *
     * <p>Genealogik tenant kerak bo'lgan joylar (masalan a'zo tekshiruvi) shu metoddan foydalanadi.</p>
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
        // Scope egasining tenant'i; egasida yo'q bo'lsa — parent scope egasiniki
        // (masalan xonadon egasi tenant'siz texnik akkaunt bo'lsa).
        FamilyGroup own = scope.getOwnerUser() != null
                ? scope.getOwnerUser().getFamilyGroup() : null;
        if (own != null) {
            return Optional.of(own);
        }
        Scope parent = scope.getParentScope();
        if (parent == null || parent.getOwnerUser() == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(parent.getOwnerUser().getFamilyGroup());
    }

    /**
     * Joriy aktiv HOUSEHOLD scope. Aktiv scope HOUSEHOLD bo'lsa — o'zi; GROUP bo'lsa —
     * uning birinchi faol HOUSEHOLD'i. Yangi FamilyMember/FamilyUnit'ni xonadonga
     * (byudjet-scope'ga) bog'lash uchun ishlatiladi.
     */
    @Transactional(readOnly = true)
    public Optional<Scope> getActiveHousehold() {
        return getActiveScopeOptional().flatMap(this::resolveHousehold);
    }

    private Optional<Scope> resolveHousehold(Scope scope) {
        if (scope.getType() == ScopeType.HOUSEHOLD) {
            return Optional.of(scope);
        }
        // ADR-003 skew-himoya: eski JWT'da activeScopeId hali arxivlangan GROUP bo'lishi
        // mumkin (deploy oynasi) — V60'dan keyin bunday guruhning bolalari uzilgan, shu
        // sabab bu tarmoq odatda bo'sh qaytadi va chaqiruvchi xavfsiz xato beradi.
        if (scope.getType() == ScopeType.GROUP) {
            return scopeRepository.findFirstByParentScopeIdAndTypeAndIsActiveTrue(
                    scope.getId(), ScopeType.HOUSEHOLD);
        }
        return Optional.empty();
    }

    /**
     * ADR-002 P4c: joriy user HAMYON-KONTEKST scope'ida (aktiv scope HOUSEHOLD/CLASS
     * bo'lsa — o'sha; GROUP bo'lsa — birinchi xonadoni) OWNER yoki ADMIN'mi.
     *
     * <p>Points boshqaruvi uchun scope-admin fallback: o'qituvchi (CLASS ADMIN) o'z
     * sinfida, xonadon egasi o'z uyida global POINTS_MANAGE* rolisiz ham ball/vazifa/
     * do'kon yurita oladi. Farzand (membership'siz yoki oddiy MEMBER) hech narsa olmaydi.
     * Pulga konvertatsiya bunga bog'liq emas — u baribir faqat HOUSEHOLD hamyonida
     * (PointConversionService guard'i).</p>
     */
    @Transactional(readOnly = true)
    public boolean canManageActiveWalletScope() {
        Scope active = getActiveScopeOptional().orElse(null);
        if (active == null) return false;
        Scope wallet = (active.getType() == ScopeType.HOUSEHOLD || active.getType() == ScopeType.CLASS)
                ? active
                : resolveHousehold(active).orElse(null);
        return wallet != null && canManageScope(wallet.getId());
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
     *
     * <p>SUPER_ADMIN read-only platforma profili: hech bir scope'ni BOSHQARMAYDI
     * (yozish/membership). U faqat {@link #getVisibleScopeIds()} orqali ko'radi —
     * shu sabab bu yerda super-admin bypass'i ATAYIN yo'q.</p>
     */
    @Transactional(readOnly = true)
    public Set<Long> getManageableScopeIds() {
        Long userId = getCurrentUserId();
        if (userId == null) {
            return Collections.emptySet();
        }
        return scopeRepository.findManageableScopeIdsForUser(userId);
    }

    // ====================================================================
    // Permission checks
    // ====================================================================

    /**
     * Joriy user shu scope'da OWNER yoki ADMIN'mi?
     *
     * <p>SUPER_ADMIN read-only: boshqaruvga ruxsat yo'q — super-admin bypass'i ATAYIN
     * olib tashlandi (faqat ko'rish — {@link #canViewScope}).</p>
     */
    public boolean canManageScope(Long scopeId) {
        return getManageableScopeIds().contains(scopeId);
    }

    /**
     * Joriy user shu scope'da kamida MEMBER (yozish huquqi) bormi?
     *
     * <p>SUPER_ADMIN read-only: yozishga ruxsat yo'q — super-admin bypass'i ATAYIN
     * olib tashlandi. Super admin'da scope membership bo'lmagani uchun {@code false}.</p>
     */
    @Transactional(readOnly = true)
    public boolean canWriteToScope(Long scopeId) {
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
    // Assert guard'lar — scope-aware entity'larning by-id operatsiyalarida
    // ishlatiladi (IDOR/cross-tenant himoyasi). Ruxsat yo'q bo'lsa 403.
    // ====================================================================

    /** Scope ko'rinmasa AccessDeniedException (403) tashlaydi. */
    public void assertCanView(Long scopeId) {
        if (scopeId == null || !canViewScope(scopeId)) {
            throw new AccessDeniedException("Bu ma'lumotni ko'rish huquqingiz yo'q");
        }
    }

    /** Scope'ga yozish huquqi bo'lmasa AccessDeniedException (403) tashlaydi. */
    public void assertCanWrite(Long scopeId) {
        if (scopeId == null || !canWriteToScope(scopeId)) {
            throw new AccessDeniedException("Bu amalni bajarish huquqingiz yo'q");
        }
    }

    // ====================================================================
    // SUPER_ADMIN
    // ====================================================================

    public boolean isSuperAdmin() {
        CustomUserDetails details = getCurrentUserDetails();
        return details != null && Boolean.TRUE.equals(details.getUser().getIsSuperAdmin());
    }
}
