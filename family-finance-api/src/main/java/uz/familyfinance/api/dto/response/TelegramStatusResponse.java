package uz.familyfinance.api.dto.response;

import lombok.Builder;
import lombok.Data;

/**
 * Telegram deep-link tasdiqini kutayotgan frontend uchun status javobi.
 *
 * <ul>
 *   <li>{@code PENDING} — hali tasdiqlanmagan, frontend poll'ni davom ettiradi.</li>
 *   <li>{@code AUTHENTICATED} — mavjud user, {@link #jwt} bilan login.</li>
 *   <li>{@code NEEDS_REGISTRATION} — yangi user, {@link #firstName} bilan forma to'ldiriladi.</li>
 *   <li>{@code EXPIRED} — so'rov eskirdi, qaytadan boshlash kerak.</li>
 * </ul>
 */
@Data
@Builder
public class TelegramStatusResponse {

    private String status;

    /** AUTHENTICATED bo'lganda — to'liq login natijasi (token + user). */
    private JwtResponse jwt;

    /** NEEDS_REGISTRATION bo'lganda — Telegram'dan kelgan ism (forma oldindan to'ldiriladi). */
    private String firstName;
    private String lastName;

    /** PIN_LOCKED bo'lganda — qulf tugashiga qancha sekund qolgani. */
    private Long remainingLockoutSeconds;

    public static TelegramStatusResponse needsPin() {
        return TelegramStatusResponse.builder().status("NEEDS_PIN").build();
    }

    public static TelegramStatusResponse pinLocked(long remainingSeconds) {
        return TelegramStatusResponse.builder()
                .status("PIN_LOCKED")
                .remainingLockoutSeconds(remainingSeconds)
                .build();
    }

    public static TelegramStatusResponse pending() {
        return TelegramStatusResponse.builder().status("PENDING").build();
    }

    public static TelegramStatusResponse expired() {
        return TelegramStatusResponse.builder().status("EXPIRED").build();
    }

    public static TelegramStatusResponse authenticated(JwtResponse jwt) {
        return TelegramStatusResponse.builder().status("AUTHENTICATED").jwt(jwt).build();
    }

    public static TelegramStatusResponse needsRegistration(String firstName, String lastName) {
        return TelegramStatusResponse.builder()
                .status("NEEDS_REGISTRATION")
                .firstName(firstName)
                .lastName(lastName)
                .build();
    }
}
