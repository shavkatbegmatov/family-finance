package uz.familyfinance.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import uz.familyfinance.api.entity.base.BaseEntity;
import uz.familyfinance.api.enums.PointChallengeStatus;
import uz.familyfinance.api.enums.PointTaskCategory;

import java.time.LocalDate;

@Entity
@Table(name = "point_challenges")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PointChallenge extends BaseEntity {

    /** Phase 2: yangi scope (HOUSEHOLD). V37 da NOT NULL bo'ladi. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "scope_id")
    private Scope scope;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(length = 1000)
    private String description;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "reward_points", nullable = false)
    private Integer rewardPoints;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private PointChallengeStatus status = PointChallengeStatus.ACTIVE;

    @Enumerated(EnumType.STRING)
    @Column(name = "task_category", length = 20)
    private PointTaskCategory taskCategory;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;
}
