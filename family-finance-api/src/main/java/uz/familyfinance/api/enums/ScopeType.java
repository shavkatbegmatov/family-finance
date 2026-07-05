package uz.familyfinance.api.enums;

/**
 * Scope turlari — universal "Scope + Membership" arxitekturasi uchun.
 *
 * <p>Ierarxiya qoidalari (ADR-003'dan keyin):</p>
 * <ul>
 *   <li>{@link #HOUSEHOLD} — har doim mustaqil root (parent=null)</li>
 *   <li>{@link #SCHOOL} — root; {@link #CLASS} — parent=SCHOOL majburiy</li>
 * </ul>
 */
public enum ScopeType {

    /**
     * @deprecated ADR-003: guruh olib tashlandi — unda hech qanday moliyaviy ma'lumot
     * bo'lmagan (hisob ochish P2'da taqiqlangan, jamlanma ko'rinish implement qilinmagan).
     * V60 barcha GROUP'larni arxivlab, xonadonlarni mustaqil qildi. Qiymat arxiv qatorlarni
     * o'qish uchun qoladi. Kelajakdagi ko'p-xonadonli jamlanma GROUP'siz, visible-scopes
     * asosida quriladi.
     */
    @Deprecated
    GROUP,

    /** Xonadon — alohida byudjetga ega birlik; har doim mustaqil root (ADR-003). */
    HOUSEHOLD,

    /**
     * Maktab (ADR-002 P4) — ball-kontekstlari (sinflar) konteyneri, root. MOLIYA YO'Q.
     * Ariza orqali yaratiladi (isActive=false), SUPER_ADMIN tasdiqlaguncha ko'rinmaydi.
     */
    SCHOOL,

    /**
     * Sinf (ADR-002 P4) — maktab ichidagi ball-konteksti (parent=SCHOOL majburiy).
     * Bolalar Enrollment orqali yoziladi (nickname majburiy); sinf hamyoni pulga
     * konvertatsiya QILINMAYDI (P1c guard).
     */
    CLASS,

    /** @deprecated ADR-002 P3: yaratish yopiq — oilaviy biznes/investitsiya alohida hisob+byudjet bilan yuritiladi. */
    @Deprecated
    PROJECT,

    /** @deprecated ADR-002 P3: yaratish yopiq — to'y/hajj = tashkilotchi xonadonida SavingsGoal + hissa-transferlar. */
    @Deprecated
    EVENT,

    /** @deprecated ADR-002 P3: yaratish yopiq — maqsadli to'plash = SavingsGoal. */
    @Deprecated
    FUND,

    /** @deprecated ADR-002 P3: yaratish yopiq — kelajakda alohida loyiha sifatida qayta ko'riladi. */
    @Deprecated
    TRUSTEE,

    /** @deprecated ADR-002 P3: yaratish yopiq — kelajakda alohida loyiha sifatida qayta ko'riladi. */
    @Deprecated
    PROPERTY;

    /**
     * Bu tur uchun parent_scope MAJBURmi? Root turlar (HOUSEHOLD/SCHOOL, arxiv GROUP)
     * uchun yo'q; CLASS va qolgan (deprecated) turlar uchun majburiy.
     */
    public boolean requiresParent() {
        return this != GROUP && this != HOUSEHOLD && this != SCHOOL;
    }

    /**
     * Bu tur uchun parent_scope MAN ETILGANmi? HOUSEHOLD ham ADR-003'dan beri har doim
     * root — biriktirish yo'q (arxiv GROUP qatorlari ham parent'siz edi).
     */
    public boolean forbidsParent() {
        return this == GROUP || this == HOUSEHOLD || this == SCHOOL;
    }
}
