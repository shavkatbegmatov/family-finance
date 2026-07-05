package uz.familyfinance.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import uz.familyfinance.api.entity.PointMultiplierEvent;
import uz.familyfinance.api.enums.PointTaskCategory;

import java.time.LocalDateTime;
import java.util.List;

public interface PointMultiplierEventRepository extends JpaRepository<PointMultiplierEvent, Long> {

    /** ADR-002 P1b: hamyon konteksti (HOUSEHOLD scope) bo'yicha. */
    List<PointMultiplierEvent> findByScopeId(Long scopeId);

    @Query("SELECT e FROM PointMultiplierEvent e WHERE e.scope.id = :scopeId " +
           "AND e.isActive = true AND e.startDate <= :now AND e.endDate >= :now " +
           "AND (e.taskCategory IS NULL OR e.taskCategory = :category)")
    List<PointMultiplierEvent> findActiveEvents(@Param("scopeId") Long scopeId,
                                                 @Param("now") LocalDateTime now,
                                                 @Param("category") PointTaskCategory category);

    @Query("SELECT e FROM PointMultiplierEvent e WHERE e.scope.id = :scopeId " +
           "AND e.isActive = true AND e.startDate <= :now AND e.endDate >= :now")
    List<PointMultiplierEvent> findAllActiveEvents(@Param("scopeId") Long scopeId,
                                                    @Param("now") LocalDateTime now);
}
