package uz.familyfinance.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import uz.familyfinance.api.entity.base.BaseEntity;
import uz.familyfinance.api.enums.PointInvestmentType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "point_investments")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PointInvestment extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "family_group_id", nullable = false)
    private FamilyGroup familyGroup;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "participant_id", nullable = false)
    private PointParticipant participant;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PointInvestmentType type;

    @Column(name = "invested_amount", nullable = false)
    private Integer investedAmount;

    @Column(name = "current_value", nullable = false)
    private Integer currentValue;

    @Column(name = "return_rate", precision = 10, scale = 4)
    @Builder.Default
    private BigDecimal returnRate = BigDecimal.ZERO;

    @Column(name = "invested_at", nullable = false)
    @Builder.Default
    private LocalDateTime investedAt = LocalDateTime.now();

    @Column(name = "maturity_date")
    private LocalDate maturityDate;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;
}
