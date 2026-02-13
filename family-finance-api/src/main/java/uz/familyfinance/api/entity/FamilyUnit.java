package uz.familyfinance.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import uz.familyfinance.api.audit.Auditable;
import uz.familyfinance.api.audit.AuditEntityListener;
import uz.familyfinance.api.entity.base.BaseEntity;
import uz.familyfinance.api.enums.FamilyUnitStatus;
import uz.familyfinance.api.enums.MarriageType;

import java.time.LocalDate;
import java.util.*;

@Entity
@Table(name = "family_units")
@EntityListeners({AuditingEntityListener.class, AuditEntityListener.class})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FamilyUnit extends BaseEntity implements Auditable {

    @Column(name = "marriage_date")
    private LocalDate marriageDate;

    @Column(name = "divorce_date")
    private LocalDate divorceDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "marriage_type", nullable = false, length = 20)
    @Builder.Default
    private MarriageType marriageType = MarriageType.MARRIED;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private FamilyUnitStatus status = FamilyUnitStatus.ACTIVE;

    @OneToMany(mappedBy = "familyUnit", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private Set<FamilyPartner> partners = new LinkedHashSet<>();

    @OneToMany(mappedBy = "familyUnit", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private Set<FamilyChild> children = new LinkedHashSet<>();

    @Override
    public String getEntityName() {
        return "FamilyUnit";
    }

    @Override
    @JsonIgnore
    public Map<String, Object> toAuditMap() {
        Map<String, Object> map = new HashMap<>();
        map.put("id", getId());
        map.put("marriageDate", this.marriageDate);
        map.put("divorceDate", this.divorceDate);
        map.put("marriageType", this.marriageType);
        map.put("status", this.status);
        return map;
    }

    @Override
    public Set<String> getSensitiveFields() {
        return Set.of();
    }
}
