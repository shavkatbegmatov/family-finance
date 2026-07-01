package uz.familyfinance.api.enums;

/**
 * Scope turlari — universal "Scope + Membership" arxitekturasi uchun.
 *
 * <p>Ierarxiya qoidalari:</p>
 * <ul>
 *   <li>{@link #CLAN} — eng yuqori daraja, parent yo'q</li>
 *   <li>Qolgan barcha turlar — parent (odatda CLAN) majburiy</li>
 * </ul>
 */
public enum ScopeType {

    /** Katta oila / urug' — eng yuqori daraja (parent=null). */
    CLAN,

    /** Xonadon — alohida byudjetga ega nuklear oila. */
    HOUSEHOLD,

    /** Loyiha — oilaviy biznes yoki uzoq muddatli investitsiya, alohida P&L. */
    PROJECT,

    /** Voqea — to'y, hajj kabi vaqtinchalik umumiy byudjet ({@code endsAt} bo'lishi mumkin). */
    EVENT,

    /** Fond — maqsadli to'plash (bolalar ta'limi, tibbiy yordam). */
    FUND,

    /** Vasiylik — kimningdir nomidan moliya boshqarish (yosh bola, qari ota-ona). */
    TRUSTEE,

    /** Ulushli mulk — ko'p egali aktiv (birgalikda sotib olingan kvartira/yer/avtomobil). */
    PROPERTY;

    /**
     * Bu tur uchun parent_scope MAJBURmi? CLAN (urug'/Group — root) va HOUSEHOLD (mustaqil
     * xonadon root bo'la oladi — ADR-001 decoupling) uchun yo'q; qolgan turlar
     * (PROJECT/EVENT/FUND/TRUSTEE/PROPERTY) uchun majburiy.
     */
    public boolean requiresParent() {
        return this != CLAN && this != HOUSEHOLD;
    }

    /**
     * Bu tur uchun parent_scope MAN ETILGANmi? Faqat CLAN har doim root (parent = null).
     * HOUSEHOLD uchun parent ixtiyoriy — {@code requiresParent()} ham {@code forbidsParent()}
     * ham {@code false}.
     */
    public boolean forbidsParent() {
        return this == CLAN;
    }

    /** Bu tur ostida HOUSEHOLD bo'lishi mumkinmi (faqat CLAN/Group)? */
    public boolean canContainHousehold() {
        return this == CLAN;
    }
}
