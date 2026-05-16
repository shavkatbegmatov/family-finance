package uz.familyfinance.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import uz.familyfinance.api.entity.BudgetAlert;

public interface BudgetAlertRepository extends JpaRepository<BudgetAlert, Long> {

    boolean existsByBudgetIdAndThreshold(Long budgetId, Integer threshold);

    @Modifying
    @Query("DELETE FROM BudgetAlert b WHERE b.budget.id = :budgetId")
    void deleteByBudgetId(@Param("budgetId") Long budgetId);
}
