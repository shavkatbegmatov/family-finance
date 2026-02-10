package uz.familyfinance.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import uz.familyfinance.api.annotation.ExportColumn;
import uz.familyfinance.api.annotation.ExportColumn.ColumnType;
import uz.familyfinance.api.annotation.ExportEntity;
import uz.familyfinance.api.audit.Auditable;
import uz.familyfinance.api.audit.AuditEntityListener;
import uz.familyfinance.api.entity.base.BaseEntity;
import uz.familyfinance.api.enums.FamilyRole;
import uz.familyfinance.api.enums.Gender;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

@Entity
@Table(name = "family_members")
@EntityListeners({AuditingEntityListener.class, AuditEntityListener.class})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ExportEntity(sheetName = "Oila a'zolari", title = "Oila A'zolari Hisoboti", orientation = ExportEntity.Orientation.LANDSCAPE)
public class FamilyMember extends BaseEntity implements Auditable {

    @Column(name = "full_name", nullable = false, length = 100)
    @ExportColumn(header = "Ism familiya", order = 1)
    private String fullName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @ExportColumn(header = "Rol", order = 2, type = ColumnType.ENUM)
    private FamilyRole role;

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    @ExportColumn(header = "Jinsi", order = 3, type = ColumnType.ENUM)
    private Gender gender;

    @Column(name = "birth_date")
    @ExportColumn(header = "Tug'ilgan sana", order = 4, type = ColumnType.DATE, format = "dd.MM.yyyy")
    private LocalDate birthDate;

    @Column(length = 20)
    @ExportColumn(header = "Telefon", order = 5)
    private String phone;

    @Column(length = 255)
    private String avatar;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    @ExportColumn(header = "Faol", order = 6, type = ColumnType.BOOLEAN)
    private Boolean isActive = true;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", unique = true)
    private User user;

    @Override
    public String getEntityName() {
        return "FamilyMember";
    }

    @Override
    @JsonIgnore
    public Map<String, Object> toAuditMap() {
        Map<String, Object> map = new HashMap<>();
        map.put("id", getId());
        map.put("fullName", this.fullName);
        map.put("role", this.role);
        map.put("gender", this.gender);
        map.put("birthDate", this.birthDate);
        map.put("phone", this.phone);
        map.put("isActive", this.isActive);
        if (this.user != null) {
            map.put("userId", this.user.getId());
        }
        return map;
    }

    @Override
    public Set<String> getSensitiveFields() {
        return Set.of();
    }
}
