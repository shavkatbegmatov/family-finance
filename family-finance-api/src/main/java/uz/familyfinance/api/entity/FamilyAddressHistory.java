package uz.familyfinance.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import uz.familyfinance.api.audit.AuditEntityListener;
import uz.familyfinance.api.audit.Auditable;
import uz.familyfinance.api.entity.base.BaseEntity;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

@Entity
@Table(name = "family_address_history")
@EntityListeners({ AuditingEntityListener.class, AuditEntityListener.class })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FamilyAddressHistory extends BaseEntity implements Auditable {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "family_group_id", nullable = false)
    private FamilyGroup familyGroup;

    @Column(nullable = false, length = 500)
    private String address;

    @Column(name = "move_in_date", nullable = false)
    private LocalDate moveInDate;

    @Column(name = "move_out_date")
    private LocalDate moveOutDate;

    @Column(name = "is_current", nullable = false)
    @Builder.Default
    private Boolean isCurrent = true;

    @Override
    public String getEntityName() {
        return "FamilyAddressHistory";
    }

    @Override
    @JsonIgnore
    public Map<String, Object> toAuditMap() {
        Map<String, Object> map = new HashMap<>();
        map.put("id", getId());
        if (this.familyGroup != null) {
            map.put("familyGroupId", this.familyGroup.getId());
        }
        map.put("address", this.address);
        map.put("moveInDate", this.moveInDate);
        map.put("moveOutDate", this.moveOutDate);
        map.put("isCurrent", this.isCurrent);
        return map;
    }

    @Override
    public Set<String> getSensitiveFields() {
        return Set.of();
    }
}
