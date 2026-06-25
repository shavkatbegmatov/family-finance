package uz.familyfinance.api.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseCookie;
import org.springframework.util.StringUtils;

import java.time.Duration;

/**
 * Auth refresh-token cookie'si (D12-PR4) — XSS himoyasi uchun httpOnly.
 *
 * <p><b>ADDITIVE:</b> hozircha tokenlar javob BODY'sida ham qaytadi (frontend localStorage bilan
 * ishlaydi). Cookie qo'shimcha qatlam — D12-PR5 (frontend cutover) refresh uchun shu cookie'ni
 * ishlatadi (access token esa xotirada qolib, Authorization header orqali yuboriladi).</p>
 *
 * <p>Cookie atributlari: {@code httpOnly} (JS o'qiy olmaydi → XSS'ga chidamli), {@code Secure}
 * (faqat HTTPS), {@code SameSite=Strict} (CSRF himoyasi — refresh faqat first-party so'rovda),
 * {@code Path=/api/v1/auth} (faqat auth endpoint'lariga yuboriladi).</p>
 */
public final class AuthCookies {

    public static final String REFRESH_TOKEN = "refresh_token";
    private static final String PATH = "/api/v1/auth";
    private static final String SAME_SITE = "Strict";

    private AuthCookies() {
        // util-klass
    }

    /** Rotatsiya/login uchun httpOnly refresh-token cookie. */
    public static ResponseCookie refreshCookie(String token, Duration maxAge) {
        return baseCookie(token).maxAge(maxAge).build();
    }

    /** Logout uchun darhol muddati o'tgan (o'chiruvchi) cookie. */
    public static ResponseCookie clearRefreshCookie() {
        return baseCookie("").maxAge(0).build();
    }

    private static ResponseCookie.ResponseCookieBuilder baseCookie(String value) {
        return ResponseCookie.from(REFRESH_TOKEN, value)
                .httpOnly(true)
                .secure(true)
                .sameSite(SAME_SITE)
                .path(PATH);
    }

    /** So'rov cookie'laridan refresh-token (PR5 cutover; topilmasa {@code null}). */
    public static String readRefreshToken(HttpServletRequest request) {
        if (request.getCookies() == null) {
            return null;
        }
        for (var cookie : request.getCookies()) {
            if (REFRESH_TOKEN.equals(cookie.getName()) && StringUtils.hasText(cookie.getValue())) {
                return cookie.getValue();
            }
        }
        return null;
    }
}
