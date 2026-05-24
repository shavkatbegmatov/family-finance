package uz.familyfinance.api.enums;

/**
 * Scope membership rollari — user'ning ma'lum scope ichidagi vakolat darajasi.
 *
 * <p>Bir user turli scope'larda turli rollarga ega bo'lishi mumkin
 * (masalan, o'z xonadonida OWNER, ota-onasi xonadonida VIEWER).</p>
 */
public enum ScopeRole {

    /** Scope egasi — barcha huquqlar, scope'ni o'chira oladi, boshqa OWNER qo'sha oladi. */
    OWNER,

    /** Operativ boshqaruvchi — a'zolarni boshqarish, lekin scope'ni o'chira olmaydi. */
    ADMIN,

    /** Aktiv a'zo — moliyaviy operatsiyalar, faqat o'zining yaratganini o'chira oladi. */
    MEMBER,

    /** Faqat ko'rish — ma'lumotlarni ko'radi, lekin o'zgartira olmaydi. */
    VIEWER,

    /** Vaqtinchalik/cheklangan — masalan, EVENT mehmoni. */
    GUEST;

    /**
     * Boshqa a'zolarni boshqarish (qo'shish/chiqarib yuborish/rol o'zgartirish) uchun
     * yetarli vakolat bormi?
     */
    public boolean canManageMembers() {
        return this == OWNER || this == ADMIN;
    }

    /** Yozish (CRUD) huquqi bormi? */
    public boolean canWrite() {
        return this == OWNER || this == ADMIN || this == MEMBER;
    }

    /** Scope'ning o'zini o'chirish/yangi OWNER qo'shish huquqi bormi? */
    public boolean isOwner() {
        return this == OWNER;
    }
}
