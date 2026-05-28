package uz.familyfinance.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import uz.familyfinance.api.entity.Scope;
import uz.familyfinance.api.enums.ScopeType;

import java.util.List;
import java.util.Optional;
import java.util.Set;

@Repository
public interface ScopeRepository extends JpaRepository<Scope, Long> {

    Optional<Scope> findByUniqueCode(String uniqueCode);

    boolean existsByUniqueCode(String uniqueCode);

    /** Berilgan user OWNER bo'lgan barcha scope'lar. */
    List<Scope> findByOwnerUserId(Long ownerUserId);

    /** Ma'lum tipdagi va aktiv scope'lar. */
    List<Scope> findByTypeAndIsActiveTrue(ScopeType type);

    /** Berilgan parent ostidagi barcha bevosita farzand scope'lar. */
    List<Scope> findByParentScopeIdAndIsActiveTrue(Long parentScopeId);

    /** Berilgan parent ostidagi birinchi ma'lum tipdagi aktiv scope. */
    Optional<Scope> findFirstByParentScopeIdAndTypeAndIsActiveTrue(Long parentScopeId, ScopeType type);

    /**
     * Berilgan user ko'rishi mumkin bo'lgan barcha scope ID'lari:
     * <ul>
     *   <li>O'zi ACTIVE membership ega bo'lgan scope'lar</li>
     *   <li>Membership ega bo'lgan HOUSEHOLD'larning parent CLAN'lari ham (parent visibility)</li>
     * </ul>
     */
    @Query("""
        SELECT DISTINCT s.id FROM Scope s
        WHERE s.isActive = true AND (
            s.id IN (
                SELECT m.scope.id FROM ScopeMembership m
                WHERE m.user.id = :userId AND m.status = 'ACTIVE'
            )
            OR s.id IN (
                SELECT child.parentScope.id FROM Scope child
                WHERE child.parentScope IS NOT NULL
                  AND child.id IN (
                      SELECT m.scope.id FROM ScopeMembership m
                      WHERE m.user.id = :userId AND m.status = 'ACTIVE'
                  )
            )
        )
        """)
    Set<Long> findVisibleScopeIdsForUser(@Param("userId") Long userId);

    /**
     * Faqat user OWNER yoki ADMIN bo'lgan scope'lar — boshqaruv operatsiyalari uchun.
     */
    @Query("""
        SELECT DISTINCT s.id FROM Scope s
        JOIN ScopeMembership m ON m.scope = s
        WHERE m.user.id = :userId
          AND m.status = 'ACTIVE'
          AND m.role IN ('OWNER','ADMIN')
          AND s.isActive = true
        """)
    Set<Long> findManageableScopeIdsForUser(@Param("userId") Long userId);

    /** EVENT scope'lardan endsAt o'tganlarini topish (avto-arxivlash uchun). */
    @Query("""
        SELECT s FROM Scope s
        WHERE s.type = 'EVENT'
          AND s.isActive = true
          AND s.endsAt IS NOT NULL
          AND s.endsAt < CURRENT_TIMESTAMP
        """)
    List<Scope> findExpiredEvents();
}
