package uz.familyfinance.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import uz.familyfinance.api.entity.base.BaseEntity;

import java.time.LocalDateTime;

/**
 * Byudjet ogohlantirishi yozuvi.
 * Bir budget davri ichida bir threshold uchun faqat bitta yozuv —
 * foydalanuvchiga takror notifikatsiya yubormaslik uchun.
 */
@Entity
@Table(
        name = "budget_alerts",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_budget_alert",
                columnNames = {"budget_id", "threshold"}
        )
)
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BudgetAlert extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "budget_id", nullable = false)
    private Budget budget;

    /** 80 yoki 100 — foiz chegarasi. */
    @Column(nullable = false)
    private Integer threshold;

    @Column(name = "sent_at", nullable = false)
    private LocalDateTime sentAt;
}
