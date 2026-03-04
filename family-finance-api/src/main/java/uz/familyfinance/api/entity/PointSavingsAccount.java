package uz.familyfinance.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import uz.familyfinance.api.entity.base.BaseEntity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "point_savings_accounts", uniqueConstraints = {
    @UniqueConstraint(name = "uk_point_savings_participant",
        columnNames = {"family_group_id", "participant_id"})
})
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PointSavingsAccount extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "family_group_id", nullable = false)
    private FamilyGroup familyGroup;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "participant_id", nullable = false)
    private PointParticipant participant;

    @Column(nullable = false)
    @Builder.Default
    private Integer balance = 0;

    @Column(name = "interest_rate", precision = 10, scale = 4)
    @Builder.Default
    private BigDecimal interestRate = BigDecimal.valueOf(0.05);

    @Column(name = "last_interest_applied_at")
    private LocalDateTime lastInterestAppliedAt;

    @Column(name = "total_interest_earned", nullable = false)
    @Builder.Default
    private Integer totalInterestEarned = 0;
}
