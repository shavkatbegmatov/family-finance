package uz.familyfinance.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import uz.familyfinance.api.audit.AuditEntityListener;
import uz.familyfinance.api.audit.Auditable;
import uz.familyfinance.api.entity.base.BaseEntity;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;

@Entity
@Table(name = "family_groups")
@EntityListeners({ AuditingEntityListener.class, AuditEntityListener.class })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FamilyGroup extends BaseEntity implements Auditable {

    @Column(nullable = false, length = 100)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "admin_id", nullable = false)
    private User admin;

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    @Override
    public String getEntityName() {
        return "FamilyGroup";
    }

    @Override
    @JsonIgnore
    public Map<String, Object> toAuditMap() {
        Map<String, Object> map = new HashMap<>();
        map.put("id", getId());
        map.put("name", this.name);
        map.put("active", this.active);
        if (this.admin != null) {
            map.put("adminId", this.admin.getId());
        }
        return map;
    }

    @Override
    public Set<String> getSensitiveFields() {
        return Set.of();
    }
}
