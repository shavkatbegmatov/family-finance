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

    @Query("SELECT b FROM Budget b WHERE b.isActive = true AND " +
           "b.startDate <= :date AND b.endDate >= :date")
    List<Budget> findActiveByDate(@Param("date") LocalDate date);

    Optional<Budget> findByCategoryIdAndIsActiveTrueAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
            Long categoryId, LocalDate startDate, LocalDate endDate);

    @Query("SELECT b FROM Budget b WHERE b.isActive = true AND " +
           "b.startDate >= :startDate AND b.endDate <= :endDate")
    List<Budget> findByDateRange(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
}
