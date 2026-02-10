package uz.familyfinance.api.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import uz.familyfinance.api.entity.SavingsGoal;

import java.math.BigDecimal;
import java.util.List;

public interface SavingsGoalRepository extends JpaRepository<SavingsGoal, Long> {
    List<SavingsGoal> findByIsCompletedFalse();
    Page<SavingsGoal> findByIsCompletedFalse(Pageable pageable);

    @Query("SELECT COALESCE(SUM(sg.currentAmount), 0) FROM SavingsGoal sg WHERE sg.isCompleted = false")
    BigDecimal getTotalSavings();

    @Query("SELECT COALESCE(SUM(sg.targetAmount), 0) FROM SavingsGoal sg WHERE sg.isCompleted = false")
    BigDecimal getTotalTarget();

    @Modifying
    @Query("UPDATE SavingsGoal sg SET sg.currentAmount = sg.currentAmount + :amount WHERE sg.id = :id")
    void addToCurrentAmount(@Param("id") Long id, @Param("amount") BigDecimal amount);

    @Modifying
    @Query("UPDATE SavingsGoal sg SET sg.isCompleted = true WHERE sg.id = :id")
    void markAsCompleted(@Param("id") Long id);
}
