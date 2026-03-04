package uz.familyfinance.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import uz.familyfinance.api.entity.base.BaseEntity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "point_balances", uniqueConstraints = {
    @UniqueConstraint(name = "uk_point_balance_participant",
        columnNames = {"family_group_id", "participant_id"})
})
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PointBalance extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "family_group_id", nullable = false)
    private FamilyGroup familyGroup;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "participant_id", nullable = false)
    private PointParticipant participant;

    @Column(name = "current_balance", nullable = false)
    @Builder.Default
    private Integer currentBalance = 0;

    @Column(name = "total_earned", nullable = false)
    @Builder.Default
    private Integer totalEarned = 0;

    @Column(name = "total_spent", nullable = false)
    @Builder.Default
    private Integer totalSpent = 0;

    @Column(name = "total_penalty", nullable = false)
    @Builder.Default
    private Integer totalPenalty = 0;

    @Column(name = "savings_balance", nullable = false)
    @Builder.Default
    private Integer savingsBalance = 0;

    @Column(name = "investment_balance", nullable = false)
    @Builder.Default
    private Integer investmentBalance = 0;

    @Column(name = "current_streak", nullable = false)
    @Builder.Default
    private Integer currentStreak = 0;

    @Column(name = "longest_streak", nullable = false)
    @Builder.Default
    private Integer longestStreak = 0;

    @Column(name = "last_task_completed_at")
    private LocalDateTime lastTaskCompletedAt;

    @Column(name = "inflation_multiplier", precision = 19, scale = 6)
    @Builder.Default
    private BigDecimal inflationMultiplier = BigDecimal.ONE;
}
