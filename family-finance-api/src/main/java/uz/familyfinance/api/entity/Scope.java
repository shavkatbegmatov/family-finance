package uz.familyfinance.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import uz.familyfinance.api.entity.base.BaseEntity;
import uz.familyfinance.api.enums.ScopeType;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Universal "scope" entity — Clan, Household, Project, Event, Fund, Trustee, Property
 * uchun bitta jadval.
 *
 * <p>Type-specific maydonlar {@link #metadata} JSONB ichida saqlanadi. Bu cheksiz
 * kengaytirilishi mumkin va yangi tur qo'shilganda schema migratsiya kerak emas.</p>
 *
 * @see uz.familyfinance.api.enums.ScopeType
 */
@Entity
@Table(name = "scopes")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Scope extends BaseEntity {

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ScopeType type;

    @Column(nullable = false, length = 150)
    private String name;

    /** Ota-scope — GROUP dan tashqari hammasida majburiy. DB constraint orqali tekshiriladi. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_scope_id")
    private Scope parentScope;

    /** Yaratuvchi/asosiy egasi — odatda OWNER role'iga ega. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_user_id", nullable = false)
    private User ownerUser;

    /** Taklif uchun unique kod (masalan "C00000042x4a9f"). */
    @Column(name = "unique_code", unique = true, length = 32)
    private String uniqueCode;

    /**
     * Inson o'qiy oladigan qisqa xonadon raqami (masalan "278-541").
     * {@link #uniqueCode} (sir invite kod) dan ALOHIDA — UI'da ko'rsatish uchun.
     * Faqat HOUSEHOLD turidagi scope'larda to'ldiriladi.
     */
    @Column(name = "display_code", length = 16)
    private String displayCode;

    /** Tur-specifik konfiguratsiya. Misol: EVENT uchun {expectedBudget: 50000000}. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata", columnDefinition = "jsonb")
    private Map<String, Object> metadata;

    /** EVENT yoki PROJECT boshlanish sanasi (ixtiyoriy). */
    @Column(name = "starts_at")
    private LocalDateTime startsAt;

    /** EVENT tugash sanasi — yetganda avtomatik arxivlanadi. */
    @Column(name = "ends_at")
    private LocalDateTime endsAt;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    /**
     * V34 da migrated GROUP scope'lar uchun asl FamilyGroup mapping'i.
     *
     * <p>Phase 2 davomida eski servislar (PointConfigService.getCurrentFamilyGroup()
     * va undan foydalanuvchilar) shu mapping orqali aktiv scope'ga mos
     * FamilyGroup'ni topadi — har bir caller'ni qayta yozish o'rniga.</p>
     *
     * <p>Yangi yaratilgan (V34 dan keyin) scope'larda NULL bo'lishi mumkin.</p>
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "legacy_family_group_id")
    private FamilyGroup legacyFamilyGroup;
}
