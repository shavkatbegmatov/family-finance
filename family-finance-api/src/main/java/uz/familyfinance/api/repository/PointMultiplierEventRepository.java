package uz.familyfinance.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import uz.familyfinance.api.entity.PointMultiplierEvent;
import uz.familyfinance.api.enums.PointTaskCategory;

import java.time.LocalDateTime;
import java.util.List;

public interface PointMultiplierEventRepository extends JpaRepository<PointMultiplierEvent, Long> {

    List<PointMultiplierEvent> findByFamilyGroupId(Long familyGroupId);

    @Query("SELECT e FROM PointMultiplierEvent e WHERE e.familyGroup.id = :groupId " +
           "AND e.isActive = true AND e.startDate <= :now AND e.endDate >= :now " +
           "AND (e.taskCategory IS NULL OR e.taskCategory = :category)")
    List<PointMultiplierEvent> findActiveEvents(@Param("groupId") Long groupId,
                                                 @Param("now") LocalDateTime now,
                                                 @Param("category") PointTaskCategory category);

    @Query("SELECT e FROM PointMultiplierEvent e WHERE e.familyGroup.id = :groupId " +
           "AND e.isActive = true AND e.startDate <= :now AND e.endDate >= :now")
    List<PointMultiplierEvent> findAllActiveEvents(@Param("groupId") Long groupId,
                                                    @Param("now") LocalDateTime now);
}
