package uz.familyfinance.api.enums;

/**
 * Scope membership holatlari.
 */
public enum MembershipStatus {

    /** Faol a'zo — barcha huquqlar (rol asosida). */
    ACTIVE,

    /** Foydalanuvchi o'zi chiqib ketgan. */
    LEFT,

    /** Admin tomonidan chiqarib yuborilgan. */
    EXPELLED,

    /** Taklif yuborilgan, lekin qabul qilinmagan. */
    PENDING;

    public boolean isActive() {
        return this == ACTIVE;
    }
}
