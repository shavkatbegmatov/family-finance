package uz.familyfinance.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import uz.familyfinance.api.entity.base.BaseEntity;
import uz.familyfinance.api.enums.PartnerRole;

@Entity
@Table(name = "family_partners")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FamilyPartner extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "family_unit_id", nullable = false)
    private FamilyUnit familyUnit;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "person_id", nullable = false)
    private FamilyMember person;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private PartnerRole role = PartnerRole.PARTNER1;
}
