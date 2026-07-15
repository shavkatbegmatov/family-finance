package uz.familyfinance.api.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import uz.familyfinance.api.entity.Budget;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface BudgetRepository extends JpaRepository<Budget, Long> {
    List<Budget> findByIsActiveTrue();
    Page<Budget> findByIsActiveTrue(Pageable pageable);

    /** Scope-aware: ko'rinadigan scope ID'lar bo'yicha aktiv byudjetlar. */
    @Query("SELECT b FROM Budget b LEFT JOIN FETCH b.category "
         + "WHERE b.isActive = true AND b.scope.id IN :scopeIds")
    Page<Budget> findByIsActiveTrueAndScopeIds(@Param("scopeIds") java.util.Collection<Long> scopeIds, Pageable pageable);

    @Query("SELECT b FROM Budget b LEFT JOIN FETCH b.category WHERE b.isActive = true AND " +
           "b.startDate <= :date AND b.endDate >= :date")
    List<Budget> findActiveByDate(@Param("date") LocalDate date);

    /** Scope-aware: faqat berilgan scope'dagi aktiv byudjetlar. */
    @Query("SELECT b FROM Budget b LEFT JOIN FETCH b.category WHERE b.isActive = true AND "
         + "b.startDate <= :date AND b.endDate >= :date AND b.scope.id = :scopeId")
    List<Budget> findActiveByDateAndScope(@Param("date") LocalDate date, @Param("scopeId") Long scopeId);

    /** Scope-aware: ko'rinadigan scope ID'lar bo'yicha aktiv byudjetlar (sana bilan). */
    @Query("SELECT b FROM Budget b LEFT JOIN FETCH b.category WHERE b.isActive = true AND "
         + "b.startDate <= :date AND b.endDate >= :date AND b.scope.id IN :scopeIds")
    List<Budget> findActiveByDateAndScopeIds(@Param("date") LocalDate date,
                                              @Param("scopeIds") java.util.Collection<Long> scopeIds);

    Optional<Budget> findByCategoryIdAndIsActiveTrueAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
            Long categoryId, LocalDate startDate, LocalDate endDate);

    /**
     * C3: Scope-aware byudjet qidiruvi — faqat berilgan scope'dagi. Aks holda
     * checkBudgetWarning boshqa urug'/xonadon byudjetini topib, noto'g'ri ogohlantirardi.
     */
    Optional<Budget> findByCategoryIdAndScopeIdAndIsActiveTrueAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
            Long categoryId, Long scopeId, LocalDate startDate, LocalDate endDate);

    @Query("SELECT b FROM Budget b WHERE b.isActive = true AND " +
           "b.startDate >= :startDate AND b.endDate <= :endDate")
    List<Budget> findByDateRange(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    /**
     * Bir kategoriya + scope uchun berilgan davr bilan KESISHUVCHI faol byudjet bormi.
     * BudgetService.create ustma-ust byudjet yaratishni rad etish uchun ishlatadi — ustma-ust
     * byudjetlar checkBudgetWarning'da IncorrectResultSize → xarajat kiritishni 500 bilan
     * bloklardi (ildiz sabab).
     */
    @Query("SELECT COUNT(b) > 0 FROM Budget b WHERE b.isActive = true "
         + "AND b.category.id = :categoryId AND b.scope.id = :scopeId "
         + "AND b.startDate <= :endDate AND b.endDate >= :startDate")
    boolean existsOverlappingActiveBudget(@Param("categoryId") Long categoryId,
                                          @Param("scopeId") Long scopeId,
                                          @Param("startDate") LocalDate startDate,
                                          @Param("endDate") LocalDate endDate);
}
