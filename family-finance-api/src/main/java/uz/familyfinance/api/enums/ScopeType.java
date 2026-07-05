package uz.familyfinance.api.enums;

/**
 * Scope turlari — universal "Scope + Membership" arxitekturasi uchun.
 *
 * <p>Ierarxiya qoidalari (ADR-001 decoupling):</p>
 * <ul>
 *   <li>{@link #GROUP} — ixtiyoriy moliyaviy aggregation guruhi, root (parent=null)</li>
 *   <li>{@link #HOUSEHOLD} — mustaqil root bo'la oladi yoki GROUP ostida</li>
 *   <li>Qolgan barcha turlar — parent majburiy</li>
 * </ul>
 */
public enum ScopeType {

    /**
     * Moliyaviy guruh — bir nechta HOUSEHOLD ustidagi IXTIYORIY aggregation (root, parent=null).
     * ADR-001: bu genealogik "urug'" EMAS (urug' qarindoshlik grafidan hosil bo'ladi) — sof
     * moliyaviy konteyner (masalan "otam + men + akamning xonadonlarini birga ko'raman").
     */
    GROUP,

    /** Xonadon — alohida byudjetga ega birlik; mustaqil root yoki GROUP ostida bo'la oladi. */
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
     * Bu tur uchun parent_scope MAJBURmi? GROUP/SCHOOL (root) va HOUSEHOLD (mustaqil root
     * bo'la oladi — ADR-001) uchun yo'q; CLASS va qolgan (deprecated) turlar uchun majburiy.
     */
    public boolean requiresParent() {
        return this != GROUP && this != HOUSEHOLD && this != SCHOOL;
    }

    /**
     * Bu tur uchun parent_scope MAN ETILGANmi? GROUP va SCHOOL har doim root (parent = null).
     * HOUSEHOLD uchun parent ixtiyoriy — ikkala helper ham {@code false}.
     */
    public boolean forbidsParent() {
        return this == GROUP || this == SCHOOL;
    }

    /** Bu tur ostida HOUSEHOLD bo'lishi mumkinmi (faqat GROUP)? */
    public boolean canContainHousehold() {
        return this == GROUP;
    }
}
