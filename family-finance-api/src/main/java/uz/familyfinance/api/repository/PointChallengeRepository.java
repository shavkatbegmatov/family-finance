package uz.familyfinance.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import uz.familyfinance.api.entity.PointChallenge;
import uz.familyfinance.api.enums.PointChallengeStatus;

import java.time.LocalDate;
import java.util.List;

public interface PointChallengeRepository extends JpaRepository<PointChallenge, Long> {

    /** ADR-002 P1b: hamyon konteksti (HOUSEHOLD scope) bo'yicha. */
    List<PointChallenge> findByScopeIdAndStatus(Long scopeId, PointChallengeStatus status);

    List<PointChallenge> findByScopeId(Long scopeId);

    List<PointChallenge> findByStatusAndEndDateBefore(PointChallengeStatus status, LocalDate date);
}
