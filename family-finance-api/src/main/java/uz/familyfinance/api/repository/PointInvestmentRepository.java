package uz.familyfinance.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import uz.familyfinance.api.entity.PointInvestment;

import java.util.List;

public interface PointInvestmentRepository extends JpaRepository<PointInvestment, Long> {

    List<PointInvestment> findByParticipantIdAndIsActiveTrue(Long participantId);

    /** ADR-002 P1b: hamyon konteksti (HOUSEHOLD scope) bo'yicha. */
    List<PointInvestment> findByScopeIdAndIsActiveTrue(Long scopeId);

    List<PointInvestment> findByIsActiveTrue();
}
