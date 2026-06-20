package uz.familyfinance.api.util;

import uz.familyfinance.api.exception.BadRequestException;

/**
 * Parol siyosati — backend uchun yagona manba (single source of truth).
 *
 * <p>Avval bir xil tekshiruv {@code AuthService} va {@code UserService} da takrorlangan edi.
 * Endi hammasi shu yerga jamlangan. Frontend hamkori:
 * {@code family-finance-front/src/utils/password.ts} — {@link #MIN_LENGTH} bir xil bo'lishi shart.</p>
 *
 * <p>Ikki daraja ("Muvozanatli" siyosat):
 * <ul>
 *   <li>{@link #validateStrength} — self-service (ro'yxatdan o'tish, o'z parolini o'zgartirish):
 *       uzunlik + murakkablik (katta harf + kichik harf + raqam).</li>
 *   <li>{@link #validateMinLength} — admin oila a'zosiga parol qo'yganda: faqat uzunlik
 *       (qulaylik uchun; foydalanuvchi keyin kuchli parolga o'zgartiradi).</li>
 * </ul>
 */
public final class PasswordPolicy {

    /** Minimal parol uzunligi — DTO {@code @Size} va front {@code password.ts} bilan izchil. */
    public static final int MIN_LENGTH = 10;

    /** Maksimal parol uzunligi. */
    public static final int MAX_LENGTH = 100;

    private PasswordPolicy() {
        // util-klass — instansiya yaratilmaydi
    }

    /**
     * Faqat uzunlik tekshiruvi (admin tomonidan qo'yiladigan parol uchun).
     *
     * @throws BadRequestException parol {@code null} yoki {@link #MIN_LENGTH} dan qisqa bo'lsa
     */
    public static void validateMinLength(String password) {
        if (password == null || password.length() < MIN_LENGTH) {
            throw new BadRequestException(
                    "Parol kamida " + MIN_LENGTH + " belgidan iborat bo'lishi kerak");
        }
    }

    /**
     * To'liq tekshiruv: uzunlik + murakkablik (self-service parol uchun).
     *
     * @throws BadRequestException uzunlik yetarsiz yoki katta/kichik harf/raqam yo'q bo'lsa
     */
    public static void validateStrength(String password) {
        validateMinLength(password);

        boolean hasUpper = password.chars().anyMatch(Character::isUpperCase);
        boolean hasLower = password.chars().anyMatch(Character::isLowerCase);
        boolean hasDigit = password.chars().anyMatch(Character::isDigit);

        if (!hasUpper || !hasLower || !hasDigit) {
            throw new BadRequestException(
                    "Parol katta harf, kichik harf va raqam o'z ichiga olishi kerak");
        }
    }
}
