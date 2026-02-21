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
@EntityListeners({ AuditingEntityListener.class, AuditEntityListener.class })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ExportEntity(sheetName = "Oila a'zolari", title = "Oila A'zolari Hisoboti", orientation = ExportEntity.Orientation.LANDSCAPE)
public class FamilyMember extends BaseEntity implements Auditable {

    @Column(name = "first_name", nullable = false, length = 100)
    @ExportColumn(header = "Ism", order = 1)
    private String firstName;

    @Column(name = "last_name", length = 100)
    @ExportColumn(header = "Familiya", order = 2)
    private String lastName;

    @Column(name = "middle_name", length = 100)
    @ExportColumn(header = "Otasining ismi", order = 3)
    private String middleName;

    @Column(name = "birth_place", length = 200)
    private String birthPlace;

    @Column(name = "death_date")
    private LocalDate deathDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @ExportColumn(header = "Rol", order = 4, type = ColumnType.ENUM)
    private FamilyRole role;

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    @ExportColumn(header = "Jinsi", order = 5, type = ColumnType.ENUM)
    private Gender gender;

    @Column(name = "birth_date")
    @ExportColumn(header = "Tug'ilgan sana", order = 6, type = ColumnType.DATE, format = "dd.MM.yyyy")
    private LocalDate birthDate;

    @Column(length = 20)
    @ExportColumn(header = "Telefon", order = 7)
    private String phone;

    @Column(length = 255)
    private String avatar;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    @ExportColumn(header = "Faol", order = 8, type = ColumnType.BOOLEAN)
    private Boolean isActive = true;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", unique = true)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "family_group_id")
    private FamilyGroup familyGroup;

    /**
     * To'liq ismni hisoblash: "Familiya Ism Otasining ismi" formatida.
     * getFullName() ham shu methodga yo'naltiradi — orqaga qarab moslik uchun.
     */
    public String getFullName() {
        return getDisplayName();
    }

    public String getDisplayName() {
        StringBuilder sb = new StringBuilder();
        if (this.lastName != null && !this.lastName.isBlank()) {
            sb.append(this.lastName).append(" ");
        }
        sb.append(this.firstName);
        if (this.middleName != null && !this.middleName.isBlank()) {
            sb.append(" ").append(this.middleName);
        }
        return sb.toString().trim();
    }

    @Override
    public String getEntityName() {
        return "FamilyMember";
    }

    @Override
    @JsonIgnore
    public Map<String, Object> toAuditMap() {
        Map<String, Object> map = new HashMap<>();
        map.put("id", getId());
        map.put("firstName", this.firstName);
        map.put("lastName", this.lastName);
        map.put("middleName", this.middleName);
        map.put("birthPlace", this.birthPlace);
        map.put("deathDate", this.deathDate);
        map.put("role", this.role);
        map.put("gender", this.gender);
        map.put("birthDate", this.birthDate);
        map.put("phone", this.phone);
        map.put("isActive", this.isActive);
        if (this.user != null) {
            map.put("userId", this.user.getId());
        }
        if (this.familyGroup != null) {
            map.put("familyGroupId", this.familyGroup.getId());
        }
        return map;
    }

    @Override
    public Set<String> getSensitiveFields() {
        return Set.of();
    }
}
