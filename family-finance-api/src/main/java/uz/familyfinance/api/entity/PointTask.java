package uz.familyfinance.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import uz.familyfinance.api.entity.base.BaseEntity;
import uz.familyfinance.api.enums.PointTaskCategory;
import uz.familyfinance.api.enums.PointTaskRecurrence;
import uz.familyfinance.api.enums.PointTaskStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "point_tasks")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PointTask extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "family_group_id", nullable = false)
    private FamilyGroup familyGroup;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(length = 1000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PointTaskCategory category;

    @Column(name = "point_value", nullable = false)
    private Integer pointValue;

    @Column(name = "penalty_value")
    @Builder.Default
    private Integer penaltyValue = 0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_to")
    private PointParticipant assignedTo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_by", nullable = false)
    private User assignedBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private PointTaskStatus status = PointTaskStatus.DRAFT;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private PointTaskRecurrence recurrence = PointTaskRecurrence.ONCE;

    @Column
    private LocalDateTime deadline;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "verified_by")
    private User verifiedBy;

    @Column(name = "rejection_reason", length = 500)
    private String rejectionReason;

    @Column(length = 50)
    private String icon;

    @Column(length = 20)
    private String color;

    @Column(name = "parent_task_id")
    private Long parentTaskId;

    @Column(precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal multiplier = BigDecimal.ONE;
}
