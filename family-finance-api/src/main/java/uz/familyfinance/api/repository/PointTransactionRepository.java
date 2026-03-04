package uz.familyfinance.api.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import uz.familyfinance.api.entity.PointTransaction;
import uz.familyfinance.api.enums.PointTransactionType;

import java.time.LocalDateTime;
import java.util.List;

public interface PointTransactionRepository extends JpaRepository<PointTransaction, Long> {

    Page<PointTransaction> findByParticipantIdOrderByTransactionDateDesc(Long participantId, Pageable pageable);

    Page<PointTransaction> findByFamilyGroupIdOrderByTransactionDateDesc(Long familyGroupId, Pageable pageable);

    List<PointTransaction> findByParticipantIdAndType(Long participantId, PointTransactionType type);

    @Query("SELECT SUM(t.amount) FROM PointTransaction t WHERE t.participant.id = :participantId " +
           "AND t.amount > 0 AND t.transactionDate BETWEEN :start AND :end")
    Integer sumEarnedBetween(@Param("participantId") Long participantId,
                             @Param("start") LocalDateTime start,
                             @Param("end") LocalDateTime end);
}
