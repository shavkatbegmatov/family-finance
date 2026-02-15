package uz.familyfinance.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import uz.familyfinance.api.audit.Auditable;
import uz.familyfinance.api.audit.AuditEntityListener;
import uz.familyfinance.api.entity.base.BaseEntity;
import uz.familyfinance.api.enums.RecurringPattern;
import uz.familyfinance.api.enums.TransactionStatus;
import uz.familyfinance.api.enums.TransactionType;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

@Entity
@Table(name = "transactions")
@EntityListeners({AuditingEntityListener.class, AuditEntityListener.class})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Transaction extends BaseEntity implements Auditable {

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TransactionType type;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;

    // Eski maydonlar (backward compatibility uchun saqlanadi)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "to_account_id")
    private Account toAccount;

    // ==========================================
    // Yangi Double-Entry maydonlari
    // ==========================================

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "debit_account_id")
    private Account debitAccount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "credit_account_id")
    private Account creditAccount;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    @Builder.Default
    private TransactionStatus status = TransactionStatus.CONFIRMED;

    @Column(name = "balance_before_debit", precision = 19, scale = 2)
    private BigDecimal balanceBeforeDebit;

    @Column(name = "balance_after_debit", precision = 19, scale = 2)
    private BigDecimal balanceAfterDebit;

    @Column(name = "balance_before_credit", precision = 19, scale = 2)
    private BigDecimal balanceBeforeCredit;

    @Column(name = "balance_after_credit", precision = 19, scale = 2)
    private BigDecimal balanceAfterCredit;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reversed_by_id")
    private Transaction reversedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "original_transaction_id")
    private Transaction originalTransaction;

    // ==========================================
    // Mavjud maydonlar
    // ==========================================

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "family_member_id")
    private FamilyMember familyMember;

    @Column(name = "transaction_date", nullable = false)
    private LocalDateTime transactionDate;

    @Column(length = 500)
    private String description;

    @Column(name = "is_recurring", nullable = false)
    @Builder.Default
    private Boolean isRecurring = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "recurring_pattern", length = 20)
    private RecurringPattern recurringPattern;

    @Column(length = 500)
    private String tags;

    @Override
    public String getEntityName() {
        return "Transaction";
    }

    @Override
    @JsonIgnore
    public Map<String, Object> toAuditMap() {
        Map<String, Object> map = new HashMap<>();
        map.put("id", getId());
        map.put("type", this.type);
        map.put("amount", this.amount);
        map.put("status", this.status);
        map.put("transactionDate", this.transactionDate);
        map.put("description", this.description);
        map.put("isRecurring", this.isRecurring);
        map.put("recurringPattern", this.recurringPattern);
        map.put("tags", this.tags);
        if (this.account != null) map.put("accountId", this.account.getId());
        if (this.toAccount != null) map.put("toAccountId", this.toAccount.getId());
        if (this.debitAccount != null) map.put("debitAccountId", this.debitAccount.getId());
        if (this.creditAccount != null) map.put("creditAccountId", this.creditAccount.getId());
        if (this.category != null) map.put("categoryId", this.category.getId());
        if (this.familyMember != null) map.put("familyMemberId", this.familyMember.getId());
        if (this.originalTransaction != null) map.put("originalTransactionId", this.originalTransaction.getId());
        return map;
    }

    @Override
    public Set<String> getSensitiveFields() {
        return Set.of();
    }
}
