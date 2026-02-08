package uz.familyfinance.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import uz.familyfinance.api.audit.Auditable;
import uz.familyfinance.api.audit.AuditEntityListener;
import uz.familyfinance.api.entity.base.BaseEntity;
import uz.familyfinance.api.enums.DebtStatus;
import uz.familyfinance.api.enums.DebtType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Entity
@Table(name = "debts")
@EntityListeners({AuditingEntityListener.class, AuditEntityListener.class})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Debt extends BaseEntity implements Auditable {

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DebtType type;

    @Column(name = "person_name", nullable = false, length = 100)
    private String personName;

    @Column(name = "person_phone", length = 20)
    private String personPhone;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;

    @Column(name = "remaining_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal remainingAmount;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private DebtStatus status = DebtStatus.ACTIVE;

    @Column(length = 500)
    private String description;

    @OneToMany(mappedBy = "debt", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    @Builder.Default
    private List<DebtPayment> payments = new ArrayList<>();

    @Override
    public String getEntityName() {
        return "Debt";
    }

    @Override
    @JsonIgnore
    public Map<String, Object> toAuditMap() {
        Map<String, Object> map = new HashMap<>();
        map.put("id", getId());
        map.put("type", this.type);
        map.put("personName", this.personName);
        map.put("personPhone", this.personPhone);
        map.put("amount", this.amount);
        map.put("remainingAmount", this.remainingAmount);
        map.put("dueDate", this.dueDate);
        map.put("status", this.status);
        map.put("description", this.description);
        return map;
    }

    @Override
    public Set<String> getSensitiveFields() {
        return Set.of();
    }
}
