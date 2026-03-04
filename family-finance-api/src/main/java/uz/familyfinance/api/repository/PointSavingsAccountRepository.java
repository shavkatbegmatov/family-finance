package uz.familyfinance.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import uz.familyfinance.api.entity.PointSavingsAccount;

import java.util.List;
import java.util.Optional;

public interface PointSavingsAccountRepository extends JpaRepository<PointSavingsAccount, Long> {

    Optional<PointSavingsAccount> findByParticipantId(Long participantId);

    List<PointSavingsAccount> findByFamilyGroupId(Long familyGroupId);

    Optional<PointSavingsAccount> findByFamilyGroupIdAndParticipantId(Long familyGroupId, Long participantId);
}
