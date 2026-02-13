package uz.familyfinance.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import uz.familyfinance.api.entity.base.BaseEntity;
import uz.familyfinance.api.enums.LineageType;

@Entity
@Table(name = "family_children")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FamilyChild extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "family_unit_id", nullable = false)
    private FamilyUnit familyUnit;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "person_id", nullable = false)
    private FamilyMember person;

    @Enumerated(EnumType.STRING)
    @Column(name = "lineage_type", nullable = false, length = 20)
    @Builder.Default
    private LineageType lineageType = LineageType.BIOLOGICAL;

    @Column(name = "birth_order")
    private Integer birthOrder;
}
