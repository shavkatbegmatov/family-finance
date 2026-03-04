package uz.familyfinance.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import uz.familyfinance.api.entity.PointAchievement;

import java.util.List;

public interface PointAchievementRepository extends JpaRepository<PointAchievement, Long> {

    @Query("SELECT a FROM PointAchievement a WHERE a.isActive = true AND " +
           "(a.familyGroup IS NULL OR a.familyGroup.id = :groupId)")
    List<PointAchievement> findActiveByGroupOrSystem(@Param("groupId") Long groupId);

    List<PointAchievement> findByIsSystemTrueAndIsActiveTrue();

    List<PointAchievement> findByFamilyGroupIdAndIsActiveTrue(Long familyGroupId);
}
