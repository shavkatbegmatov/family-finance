package uz.familyfinance.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import uz.familyfinance.api.entity.base.BaseEntity;

import java.math.BigDecimal;

/**
 * Bitta tranzaksiyani bir nechta kategoriyaga bo'lish.
 * Misol: 500k xarid — 200k Oziq-ovqat, 100k Maishiy, 200k Boshqa.
 *
 * Asosiy Transaction.category null bo'ladi, splits ro'yxati orqali ulushlar.
 * Summa: sum(splits.amount) == transaction.amount (TransactionService da validatsiya).
 */
@Entity
@Table(name = "transaction_splits")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransactionSplit extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "transaction_id", nullable = false)
    private Transaction transaction;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;

    @Column(length = 500)
    private String note;
}
