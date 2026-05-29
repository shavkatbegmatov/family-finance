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

    /** Bu tur uchun parent_scope majburiymi? */
    public boolean requiresParent() {
        return this != CLAN;
    }

    /** Bu tur ostida HOUSEHOLD bo'lishi mumkinmi (faqat CLAN)? */
    public boolean canContainHousehold() {
        return this == CLAN;
    }
}
