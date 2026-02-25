package uz.familyfinance.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import uz.familyfinance.api.audit.Auditable;
import uz.familyfinance.api.audit.AuditEntityListener;
import uz.familyfinance.api.entity.base.BaseEntity;
import uz.familyfinance.api.enums.CardType;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;

@Entity
@Table(name = "cards")
@EntityListeners({ AuditingEntityListener.class, AuditEntityListener.class })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Card extends BaseEntity implements Auditable {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    @Enumerated(EnumType.STRING)
    @Column(name = "card_type", nullable = false, length = 20)
    private CardType cardType;

    @Column(name = "card_bin", length = 6)
    private String cardBin;

    @Column(name = "card_last_four", nullable = false, length = 4)
    private String cardLastFour;

    @Column(name = "card_number_encrypted", length = 512)
    private String cardNumberEncrypted;

    @Column(name = "card_holder_name", length = 100)
    private String cardHolderName;

    @Column(name = "expiry_date", length = 5)
    private String expiryDate;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "is_virtual")
    @Builder.Default
    private Boolean isVirtual = false;

    /**
     * Masklangan karta raqamini qaytaradi: "4441 11** **** 1234"
     */
    public String getMaskedNumber() {
        if (cardBin != null && cardLastFour != null) {
            String bin4 = cardBin.substring(0, Math.min(4, cardBin.length()));
            String bin2 = cardBin.length() > 4 ? cardBin.substring(4) : "**";
            return bin4 + " " + bin2 + "** **** " + cardLastFour;
        }
        return "**** **** **** " + (cardLastFour != null ? cardLastFour : "****");
    }

    @Override
    public String getEntityName() {
        return "Card";
    }

    @Override
    @JsonIgnore
    public Map<String, Object> toAuditMap() {
        Map<String, Object> map = new HashMap<>();
        map.put("id", getId());
        map.put("cardType", this.cardType);
        map.put("cardBin", this.cardBin);
        map.put("cardLastFour", this.cardLastFour);
        map.put("cardHolderName", this.cardHolderName);
        map.put("expiryDate", this.expiryDate);
        map.put("isActive", this.isActive);
        if (this.account != null) {
            map.put("accountId", this.account.getId());
        }
        return map;
    }

    @Override
    public Set<String> getSensitiveFields() {
        return Set.of("cardNumberEncrypted");
    }
}
