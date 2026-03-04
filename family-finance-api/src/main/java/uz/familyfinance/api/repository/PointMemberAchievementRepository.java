package uz.familyfinance.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import uz.familyfinance.api.entity.PointMemberAchievement;

import java.util.List;
import java.util.Optional;

public interface PointMemberAchievementRepository extends JpaRepository<PointMemberAchievement, Long> {

    List<PointMemberAchievement> findByParticipantId(Long participantId);

    boolean existsByParticipantIdAndAchievementId(Long participantId, Long achievementId);

    Optional<PointMemberAchievement> findByParticipantIdAndAchievementId(Long participantId, Long achievementId);
}
