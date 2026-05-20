package uz.familyfinance.api.enums;

/**
 * Shaxs turlari — "Yangi shaxs qo'shish" wizard'i uchun.
 * Har bir tur qaysi entity'lar yaratilishini belgilaydi:
 *
 * <ul>
 *   <li>{@link #CHILD} — FamilyMember + PointParticipant (login yo'q)</li>
 *   <li>{@link #ADULT_ACTIVE} — User + FamilyMember + PointParticipant (to'liq)</li>
 *   <li>{@link #PASSIVE_MEMBER} — faqat FamilyMember (login ham, ball ham yo'q)</li>
 *   <li>{@link #ADMIN_ONLY} — User + FamilyMember (ballarda qatnashmaydi)</li>
 * </ul>
 */
public enum PersonType {

    /** Bola — oilada va ball tizimida, lekin tizimga kirmaydi. */
    CHILD,

    /** Katta yoshli faol a'zo — tizimga kiradi va ball to'playdi. */
    ADULT_ACTIVE,

    /** Passiv oila a'zosi — faqat hisobotda ko'rinadi. */
    PASSIVE_MEMBER,

    /** Admin yoki hisobchi — tizimga kiradi, lekin ball tizimida qatnashmaydi. */
    ADMIN_ONLY;

    /** Tanlangan tur uchun User akkaunti yaratilishi kerakmi? */
    public boolean needsUser() {
        return this == ADULT_ACTIVE || this == ADMIN_ONLY;
    }

    /** Tanlangan tur uchun PointParticipant yaratilishi kerakmi? */
    public boolean needsParticipant() {
        return this == CHILD || this == ADULT_ACTIVE;
    }
}
