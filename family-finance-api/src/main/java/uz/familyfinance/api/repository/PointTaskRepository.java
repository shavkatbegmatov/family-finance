package uz.familyfinance.api.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import uz.familyfinance.api.entity.PointTask;
import uz.familyfinance.api.enums.PointTaskStatus;

import java.time.LocalDateTime;
import java.util.List;

public interface PointTaskRepository extends JpaRepository<PointTask, Long> {

    Page<PointTask> findByFamilyGroupId(Long familyGroupId, Pageable pageable);

    Page<PointTask> findByFamilyGroupIdAndStatus(Long familyGroupId, PointTaskStatus status, Pageable pageable);

    List<PointTask> findByAssignedToId(Long participantId);

    Page<PointTask> findByAssignedToIdAndStatus(Long participantId, PointTaskStatus status, Pageable pageable);

    @Query("SELECT t FROM PointTask t WHERE t.status NOT IN ('VERIFIED','REJECTED','FAILED','EXPIRED') " +
           "AND t.deadline IS NOT NULL AND t.deadline < :now")
    List<PointTask> findExpiredTasks(@Param("now") LocalDateTime now);

    @Query("SELECT t FROM PointTask t WHERE t.familyGroup.id = :groupId AND t.status = 'SUBMITTED'")
    List<PointTask> findPendingVerification(@Param("groupId") Long groupId);

    @Query("SELECT COUNT(t) FROM PointTask t WHERE t.assignedTo.id = :participantId AND t.status = 'VERIFIED'")
    long countVerifiedByParticipant(@Param("participantId") Long participantId);

    @Query("SELECT t FROM PointTask t WHERE t.recurrence <> 'ONCE' AND t.status = 'VERIFIED' " +
           "AND t.familyGroup.id = :groupId")
    List<PointTask> findRecurringTemplates(@Param("groupId") Long groupId);
}
