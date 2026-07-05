package uz.familyfinance.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import uz.familyfinance.api.entity.PointAchievement;

import java.util.List;

public interface PointAchievementRepository extends JpaRepository<PointAchievement, Long> {

    /** ADR-002 P1b: scope NULL = global (tizim) yutuq — hamyon-kontekst yoki global. */
    @Query("SELECT a FROM PointAchievement a WHERE a.isActive = true AND " +
           "(a.scope IS NULL OR a.scope.id = :scopeId)")
    List<PointAchievement> findActiveByScopeOrSystem(@Param("scopeId") Long scopeId);

    List<PointAchievement> findByIsSystemTrueAndIsActiveTrue();

    List<PointAchievement> findByScopeIdAndIsActiveTrue(Long scopeId);
}
