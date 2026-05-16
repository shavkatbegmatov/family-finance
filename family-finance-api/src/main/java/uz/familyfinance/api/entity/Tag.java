package uz.familyfinance.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import uz.familyfinance.api.entity.base.BaseEntity;

@Entity
@Table(
        name = "tags",
        uniqueConstraints = @UniqueConstraint(name = "uk_tag_name", columnNames = "name")
)
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Tag extends BaseEntity {

    /** Lowercase, trimmed. "Yangi uy" → "yangi-uy". */
    @Column(nullable = false, length = 50)
    private String name;

    /** Hex rang (#RRGGBB) yoki Tailwind class nomi. */
    @Column(length = 20)
    private String color;
}
