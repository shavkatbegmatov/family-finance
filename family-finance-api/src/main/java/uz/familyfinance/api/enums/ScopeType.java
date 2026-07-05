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
     * Bu tur uchun parent_scope MAJBURmi? GROUP (root) va HOUSEHOLD (mustaqil xonadon root
     * bo'la oladi — ADR-001 decoupling) uchun yo'q; qolgan turlar
     * (PROJECT/EVENT/FUND/TRUSTEE/PROPERTY) uchun majburiy.
     */
    public boolean requiresParent() {
        return this != GROUP && this != HOUSEHOLD;
    }

    /**
     * Bu tur uchun parent_scope MAN ETILGANmi? Faqat GROUP har doim root (parent = null).
     * HOUSEHOLD uchun parent ixtiyoriy — {@code requiresParent()} ham {@code forbidsParent()}
     * ham {@code false}.
     */
    public boolean forbidsParent() {
        return this == GROUP;
    }

    /** Bu tur ostida HOUSEHOLD bo'lishi mumkinmi (faqat GROUP)? */
    public boolean canContainHousehold() {
        return this == GROUP;
    }
}
