package uz.familyfinance.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import uz.familyfinance.api.entity.base.BaseEntity;
import uz.familyfinance.api.enums.MembershipStatus;
import uz.familyfinance.api.enums.ScopeRole;

import java.time.LocalDateTime;

/**
 * User'ning ma'lum {@link Scope} ichidagi a'zoligi va roli.
 *
 * <p>Bir user bir scope'da faqat <b>bitta</b> membership'ga ega bo'la oladi (DB unique constraint).
 * Lekin user turli scope'larda turli rollarda bo'lishi mumkin (M:N orqali).</p>
 */
@Entity
@Table(
    name = "scope_memberships",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_scope_membership",
        columnNames = {"scope_id", "user_id"}
    )
)
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScopeMembership extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "scope_id", nullable = false)
    private Scope scope;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ScopeRole role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private MembershipStatus status = MembershipStatus.ACTIVE;

    @Column(name = "joined_at", nullable = false)
    @Builder.Default
    private LocalDateTime joinedAt = LocalDateTime.now();

    /** Taklif yuborgan user (PENDING/ACTIVE membership'lar uchun kuzatish). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invited_by_user_id")
    private User invitedBy;
}
