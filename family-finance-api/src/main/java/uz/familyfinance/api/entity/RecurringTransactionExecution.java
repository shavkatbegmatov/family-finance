package uz.familyfinance.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import uz.familyfinance.api.entity.base.BaseEntity;

import java.time.LocalDate;

/**
 * Recurring tranzaksiya executor idempotentligi uchun yozuv.
 * Har bir (template, execution_date) jufti uchun bitta yozuv yaratiladi —
 * scheduler bir kunda ikki marta ishlatilsa ham, qayta tranzaksiya yaratilmaydi.
 */
@Entity
@Table(
        name = "recurring_transaction_executions",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_recurring_template_date",
                columnNames = {"template_id", "execution_date"}
        )
)
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecurringTransactionExecution extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id", nullable = false)
    private Transaction template;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "generated_id", nullable = false)
    private Transaction generated;

    @Column(name = "execution_date", nullable = false)
    private LocalDate executionDate;
}
