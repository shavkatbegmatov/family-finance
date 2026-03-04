package uz.familyfinance.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import uz.familyfinance.api.entity.PointChallenge;
import uz.familyfinance.api.enums.PointChallengeStatus;

import java.time.LocalDate;
import java.util.List;

public interface PointChallengeRepository extends JpaRepository<PointChallenge, Long> {

    List<PointChallenge> findByFamilyGroupIdAndStatus(Long familyGroupId, PointChallengeStatus status);

    List<PointChallenge> findByFamilyGroupId(Long familyGroupId);

    List<PointChallenge> findByStatusAndEndDateBefore(PointChallengeStatus status, LocalDate date);
}
