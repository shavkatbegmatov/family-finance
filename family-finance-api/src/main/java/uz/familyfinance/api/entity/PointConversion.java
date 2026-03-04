package uz.familyfinance.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import uz.familyfinance.api.entity.base.BaseEntity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "point_conversions")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PointConversion extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "family_group_id", nullable = false)
    private FamilyGroup familyGroup;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "participant_id", nullable = false)
    private PointParticipant participant;

    @Column(name = "points_converted", nullable = false)
    private Integer pointsConverted;

    @Column(name = "conversion_rate", nullable = false, precision = 19, scale = 4)
    private BigDecimal conversionRate;

    @Column(name = "money_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal moneyAmount;

    @Column(length = 10)
    @Builder.Default
    private String currency = "UZS";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_account_id")
    private Account targetAccount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by")
    private User approvedBy;

    @Column(name = "conversion_date", nullable = false)
    @Builder.Default
    private LocalDateTime conversionDate = LocalDateTime.now();
}
