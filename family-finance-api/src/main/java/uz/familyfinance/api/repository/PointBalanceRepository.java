package uz.familyfinance.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import uz.familyfinance.api.entity.PointBalance;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface PointBalanceRepository extends JpaRepository<PointBalance, Long> {

    Optional<PointBalance> findByParticipantId(Long participantId);

    @Query("SELECT b FROM PointBalance b JOIN FETCH b.participant WHERE b.participant.id = :participantId")
    Optional<PointBalance> findByParticipantIdWithParticipant(@Param("participantId") Long participantId);

    List<PointBalance> findByFamilyGroupIdOrderByCurrentBalanceDesc(Long familyGroupId);

    List<PointBalance> findByFamilyGroupIdOrderByTotalEarnedDesc(Long familyGroupId);

    @Modifying
    @Query("UPDATE PointBalance b SET b.currentBalance = b.currentBalance + :amount, " +
           "b.totalEarned = b.totalEarned + CASE WHEN :amount > 0 THEN :amount ELSE 0 END, " +
           "b.totalSpent = b.totalSpent + CASE WHEN :amount < 0 THEN ABS(:amount) ELSE 0 END " +
           "WHERE b.id = :id")
    void addToBalance(@Param("id") Long id, @Param("amount") int amount);

    @Modifying
    @Query("UPDATE PointBalance b SET b.currentStreak = b.currentStreak + 1, " +
           "b.longestStreak = CASE WHEN b.currentStreak + 1 > b.longestStreak THEN b.currentStreak + 1 ELSE b.longestStreak END, " +
           "b.lastTaskCompletedAt = :completedAt WHERE b.id = :id")
    void incrementStreak(@Param("id") Long id, @Param("completedAt") LocalDateTime completedAt);

    @Modifying
    @Query("UPDATE PointBalance b SET b.currentStreak = 0 WHERE b.id = :id")
    void resetStreak(@Param("id") Long id);

    @Modifying
    @Query("UPDATE PointBalance b SET b.inflationMultiplier = b.inflationMultiplier * :factor " +
           "WHERE b.familyGroup.id = :groupId")
    void applyInflation(@Param("groupId") Long groupId, @Param("factor") BigDecimal factor);

    @Modifying
    @Query("UPDATE PointBalance b SET b.savingsBalance = b.savingsBalance + :amount WHERE b.id = :id")
    void addToSavings(@Param("id") Long id, @Param("amount") int amount);

    @Modifying
    @Query("UPDATE PointBalance b SET b.investmentBalance = b.investmentBalance + :amount WHERE b.id = :id")
    void addToInvestment(@Param("id") Long id, @Param("amount") int amount);

    @Modifying
    @Query("UPDATE PointBalance b SET b.totalPenalty = b.totalPenalty + :amount WHERE b.id = :id")
    void addToPenalty(@Param("id") Long id, @Param("amount") int amount);
}
