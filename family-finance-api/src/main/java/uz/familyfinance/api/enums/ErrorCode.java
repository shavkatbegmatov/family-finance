package uz.familyfinance.api.enums;

/**
 * API xato kodlari — mijoz (frontend) xatoni TURI bo'yicha dasturiy hal qilishi uchun
 * (o'zgaruvchan xabar matniga emas, barqaror kodga tayanib). {@code ApiResponse.errorCode} da qaytadi.
 *
 * <p>Frontend hamkori: {@code family-finance-front/src/utils/apiError.ts} (getApiErrorCode).
 * Yangi kod qo'shilsa, front tarafdagi {@code ApiErrorCode} union ham yangilanishi tavsiya etiladi.</p>
 */
public enum ErrorCode {
    /** 400 — kiritilgan ma'lumot noto'g'ri (validatsiya, format, tur, o'qib bo'lmaydigan tana). */
    VALIDATION,
    /** 401 — autentifikatsiya yo'q yoki noto'g'ri (login/parol). */
    UNAUTHORIZED,
    /** 403 — ruxsat yo'q yoki hisob bloklangan/o'chirilgan. */
    FORBIDDEN,
    /** 404 — resurs topilmadi. */
    NOT_FOUND,
    /** 409 — holat to'qnashuvi (mavjud yozuv, optimistik lock, ma'lumot yaxlitligi). */
    CONFLICT,
    /** 429 — juda ko'p urinish (rate-limit). */
    RATE_LIMITED,
    /** 500 — kutilmagan server xatosi. */
    INTERNAL
}
