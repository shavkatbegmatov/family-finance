package uz.familyfinance.api.security;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseCookie;
import org.springframework.mock.web.MockHttpServletRequest;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * {@link AuthCookies} — refresh-token cookie atributlari va o'qish mantig'i uchun toza-mantiq testlari.
 * Cookie xavfsizlik atributlari (httpOnly/Secure/SameSite) D12-PR4/PR5 uchun kritik — shu yerda pinlangan.
 */
@DisplayName("AuthCookies")
class AuthCookiesTest {

    @Test
    @DisplayName("refreshCookie: httpOnly + Secure + SameSite=Strict + Path + Max-Age")
    void refreshCookieAttributes() {
        ResponseCookie cookie = AuthCookies.refreshCookie("tok123", Duration.ofDays(1));
        assertThat(cookie.getName()).isEqualTo("refresh_token");
        assertThat(cookie.getValue()).isEqualTo("tok123");
        assertThat(cookie.isHttpOnly()).isTrue();
        assertThat(cookie.isSecure()).isTrue();
        assertThat(cookie.getSameSite()).isEqualTo("Strict");
        assertThat(cookie.getPath()).isEqualTo("/api/v1/auth");
        assertThat(cookie.getMaxAge()).isEqualTo(Duration.ofDays(1));
    }

    @Test
    @DisplayName("clearRefreshCookie: Max-Age=0 (o'chiruvchi), atributlar saqlanadi")
    void clearCookie() {
        ResponseCookie cookie = AuthCookies.clearRefreshCookie();
        assertThat(cookie.getName()).isEqualTo("refresh_token");
        assertThat(cookie.getMaxAge()).isEqualTo(Duration.ZERO);
        assertThat(cookie.isHttpOnly()).isTrue();
        assertThat(cookie.isSecure()).isTrue();
        assertThat(cookie.getPath()).isEqualTo("/api/v1/auth");
    }

    @Test
    @DisplayName("readRefreshToken: cookie mavjud bo'lsa qiymatini qaytaradi")
    void readPresent() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(new Cookie("other", "x"), new Cookie("refresh_token", "abc"));
        assertThat(AuthCookies.readRefreshToken(request)).isEqualTo("abc");
    }

    @Test
    @DisplayName("readRefreshToken: cookie umuman yo'q yoki nomi mos kelmasa -> null")
    void readAbsent() {
        MockHttpServletRequest noCookies = new MockHttpServletRequest();
        assertThat(AuthCookies.readRefreshToken(noCookies)).isNull();

        MockHttpServletRequest otherOnly = new MockHttpServletRequest();
        otherOnly.setCookies(new Cookie("other", "x"));
        assertThat(AuthCookies.readRefreshToken(otherOnly)).isNull();
    }

    @Test
    @DisplayName("readRefreshToken: bo'sh qiymatli cookie -> null")
    void readEmpty() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(new Cookie("refresh_token", ""));
        assertThat(AuthCookies.readRefreshToken(request)).isNull();
    }
}
