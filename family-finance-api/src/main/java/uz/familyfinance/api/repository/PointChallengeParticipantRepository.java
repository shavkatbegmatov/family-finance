package uz.familyfinance.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import uz.familyfinance.api.entity.PointChallengeParticipant;

import java.util.List;
import java.util.Optional;

public interface PointChallengeParticipantRepository extends JpaRepository<PointChallengeParticipant, Long> {

    List<PointChallengeParticipant> findByChallengeIdOrderByScoreDesc(Long challengeId);

    Optional<PointChallengeParticipant> findByChallengeIdAndParticipantId(Long challengeId, Long participantId);

    boolean existsByChallengeIdAndParticipantId(Long challengeId, Long participantId);
}
