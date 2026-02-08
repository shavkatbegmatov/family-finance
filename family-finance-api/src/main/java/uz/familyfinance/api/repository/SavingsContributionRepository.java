package uz.familyfinance.api.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import uz.familyfinance.api.entity.SavingsContribution;

import java.util.List;

public interface SavingsContributionRepository extends JpaRepository<SavingsContribution, Long> {
    List<SavingsContribution> findBySavingsGoalIdOrderByContributionDateDesc(Long goalId);
    Page<SavingsContribution> findBySavingsGoalId(Long goalId, Pageable pageable);
}
