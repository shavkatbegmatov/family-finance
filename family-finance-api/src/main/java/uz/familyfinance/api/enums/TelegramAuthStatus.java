package uz.familyfinance.api.enums;

/**
 * Telegram deep-link autentifikatsiya so'rovining holati.
 *
 * <p>Oqim: {@code PENDING} (init) → {@code CONFIRMED} (bot /start oldi) →
 * {@code COMPLETED} (login/registratsiya yakunlandi). Tasdiqlanmasa {@code EXPIRED}.</p>
 */
public enum TelegramAuthStatus {
    /** Init qilingan, foydalanuvchi botda tasdiqlashini kutyapti. */
    PENDING,
    /** Bot {@code /start <requestId>} oldi, Telegram ma'lumotlari biriktirildi. */
    CONFIRMED,
    /** Login yoki registratsiya yakunlandi (terminal holat). */
    COMPLETED,
    /** Muddati o'tdi (tasdiqlanmadi). */
    EXPIRED
}
