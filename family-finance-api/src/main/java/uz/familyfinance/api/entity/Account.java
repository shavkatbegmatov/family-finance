package uz.familyfinance.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import uz.familyfinance.api.audit.Auditable;
import uz.familyfinance.api.audit.AuditEntityListener;
import uz.familyfinance.api.entity.base.BaseEntity;
import uz.familyfinance.api.enums.AccountScope;
import uz.familyfinance.api.enums.AccountStatus;
import uz.familyfinance.api.enums.AccountType;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Entity
@Table(name = "accounts")
@EntityListeners({AuditingEntityListener.class, AuditEntityListener.class})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Account extends BaseEntity implements Auditable {

    @Column(nullable = false, length = 100)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AccountType type;

    @Column(nullable = false, length = 10)
    @Builder.Default
    private String currency = "UZS";

    @Column(nullable = false, precision = 19, scale = 2)
    @Builder.Default
    private BigDecimal balance = BigDecimal.ZERO;

    @Column(length = 20)
    private String color;

    @Column(length = 50)
    private String icon;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    @Builder.Default
    private AccountStatus status = AccountStatus.ACTIVE;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    @Builder.Default
    private AccountScope scope = AccountScope.PERSONAL;

    @Column(name = "opening_balance", precision = 19, scale = 2)
    @Builder.Default
    private BigDecimal openingBalance = BigDecimal.ZERO;

    @Column(name = "bank_name", length = 100)
    private String bankName;

    @Column(name = "bank_mfo", length = 5)
    private String bankMfo;

    @Column(name = "bank_inn", length = 9)
    private String bankInn;

    // ==========================================
    // Yangi bank tizimi maydonlari
    // ==========================================

    @Column(name = "acc_code", unique = true, length = 20)
    private String accCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id")
    private FamilyMember owner;

    @Column(name = "balance_account_code", length = 5)
    private String balanceAccountCode;

    @Column(name = "currency_code", length = 3)
    @Builder.Default
    private String currencyCode = "000";

    @Column(length = 500)
    private String description;

    @OneToMany(mappedBy = "account", fetch = FetchType.LAZY)
    @Builder.Default
    private List<Card> cards = new ArrayList<>();

    @OneToMany(mappedBy = "account", fetch = FetchType.LAZY)
    @Builder.Default
    private List<AccountAccess> accessList = new ArrayList<>();

    @Override
    public String getEntityName() {
        return "Account";
    }

    @Override
    @JsonIgnore
    public Map<String, Object> toAuditMap() {
        Map<String, Object> map = new HashMap<>();
        map.put("id", getId());
        map.put("name", this.name);
        map.put("type", this.type);
        map.put("currency", this.currency);
        map.put("balance", this.balance);
        map.put("accCode", this.accCode);
        map.put("balanceAccountCode", this.balanceAccountCode);
        map.put("currencyCode", this.currencyCode);
        map.put("color", this.color);
        map.put("icon", this.icon);
        map.put("isActive", this.isActive);
        map.put("status", this.status);
        map.put("scope", this.scope);
        map.put("openingBalance", this.openingBalance);
        map.put("bankName", this.bankName);
        if (this.owner != null) {
            map.put("ownerId", this.owner.getId());
        }
        return map;
    }

    @Override
    public Set<String> getSensitiveFields() {
        return Set.of();
    }
}
