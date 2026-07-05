package uz.familyfinance.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import uz.familyfinance.api.entity.base.BaseEntity;
import uz.familyfinance.api.enums.EnrollmentStatus;

import java.time.LocalDateTime;

/**
 * ADR-002 P4: bolaning (FamilyMember — login IXTIYORIY) sinfga (CLASS scope) yozilishi.
 *
 * <p>K3 maxfiylik: {@link #nickname} MAJBURIY — sinf reytingi/ro'yxatlarida faqat taxallus
 * ko'rinadi (haqiqiy ismni faqat o'qituvchi ko'radi). {@link #consentBy} — yozgan ota-ona
 * (roziligi shu yozuvning o'zi bilan qayd etiladi).</p>
 */
@Entity
@Table(name = "enrollments", uniqueConstraints = {
    @UniqueConstraint(name = "uk_enrollment_class_member",
        columnNames = {"class_scope_id", "family_member_id"})
})
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Enrollment extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "class_scope_id", nullable = false)
    private Scope classScope;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "family_member_id", nullable = false)
    private FamilyMember familyMember;

    /** Sinf ichidagi taxallus — K3: reyting/ro'yxatlarda FAQAT shu ko'rinadi. */
    @Column(nullable = false, length = 50)
    private String nickname;

    /** Yozgan (rozilik bergan) ota-ona. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "consent_by_user_id", nullable = false)
    private User consentBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private EnrollmentStatus status = EnrollmentStatus.ENROLLED;

    @Column(name = "joined_at", nullable = false)
    @Builder.Default
    private LocalDateTime joinedAt = LocalDateTime.now();

    @Column(name = "left_at")
    private LocalDateTime leftAt;
}
