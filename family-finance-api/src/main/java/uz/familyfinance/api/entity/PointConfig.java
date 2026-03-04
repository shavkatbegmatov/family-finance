package uz.familyfinance.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import uz.familyfinance.api.entity.base.BaseEntity;

import java.math.BigDecimal;

@Entity
@Table(name = "point_configs")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PointConfig extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "family_group_id", nullable = false, unique = true)
    private FamilyGroup familyGroup;

    @Column(name = "conversion_rate", nullable = false, precision = 19, scale = 4)
    @Builder.Default
    private BigDecimal conversionRate = BigDecimal.valueOf(100);

    @Column(length = 10)
    @Builder.Default
    private String currency = "UZS";

    @Column(name = "inflation_enabled", nullable = false)
    @Builder.Default
    private Boolean inflationEnabled = false;

    @Column(name = "inflation_rate_monthly", precision = 10, scale = 4)
    @Builder.Default
    private BigDecimal inflationRateMonthly = BigDecimal.ZERO;

    @Column(name = "savings_interest_rate", precision = 10, scale = 4)
    @Builder.Default
    private BigDecimal savingsInterestRate = BigDecimal.valueOf(0.05);

    @Column(name = "streak_bonus_enabled", nullable = false)
    @Builder.Default
    private Boolean streakBonusEnabled = true;

    @Column(name = "streak_bonus_percentage", precision = 10, scale = 4)
    @Builder.Default
    private BigDecimal streakBonusPercentage = BigDecimal.valueOf(0.1);

    @Column(name = "max_daily_points")
    private Integer maxDailyPoints;

    @Column(name = "auto_approve_below")
    private Integer autoApproveBelow;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;
}
