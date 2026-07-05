package uz.familyfinance.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import uz.familyfinance.api.entity.base.BaseEntity;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "point_inflation_snapshots")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PointInflationSnapshot extends BaseEntity {

    /** ADR-002 P1: hamyon konteksti (HOUSEHOLD scope). V56 backfill; P1c'da NOT NULL + fg DROP. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "scope_id")
    private Scope scope;

    @Column(name = "snapshot_date", nullable = false)
    private LocalDate snapshotDate;

    @Column(name = "inflation_rate", nullable = false, precision = 10, scale = 4)
    private BigDecimal inflationRate;

    @Column(name = "cumulative_multiplier", nullable = false, precision = 19, scale = 6)
    private BigDecimal cumulativeMultiplier;
}
