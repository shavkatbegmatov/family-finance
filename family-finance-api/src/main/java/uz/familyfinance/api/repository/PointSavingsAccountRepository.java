package uz.familyfinance.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import uz.familyfinance.api.entity.PointSavingsAccount;

import java.util.List;
import java.util.Optional;

public interface PointSavingsAccountRepository extends JpaRepository<PointSavingsAccount, Long> {

    Optional<PointSavingsAccount> findByParticipantId(Long participantId);

    /** ADR-002 P1b: hamyon konteksti (HOUSEHOLD scope) bo'yicha. */
    List<PointSavingsAccount> findByScopeId(Long scopeId);

    Optional<PointSavingsAccount> findByScopeIdAndParticipantId(Long scopeId, Long participantId);
}
