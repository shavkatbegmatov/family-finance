package uz.familyfinance.api.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * {@link JwtTokenProvider} — token NOYOBLIGI (jti) uchun toza-mantiq testlari (C5).
 *
 * Spring konteksti/DB kerak emas — {@link ReflectionTestUtils} bilan @Value maydonlari
 * o'rnatilib {@code init()} chaqiriladi. AuthSessionIntegrationTest topgan bug'ni qulflaydi:
 * iat soniya aniqligida bo'lgani uchun bir xil user bir soniyada qayta login qilsa, token
 * bir xil bo'lib refresh_token_hash UNIQUE constraint'ini buzardi (500). jti (UUID) buni
 * oldini oladi — har token noyob.
 */
@DisplayName("JwtTokenProvider — token noyobligi (jti)")
class JwtTokenProviderTest {

    private JwtTokenProvider provider;

    @BeforeEach
    void setUp() {
        provider = new JwtTokenProvider();
        // Dev-only test sekreti (valid base64, HMAC-SHA uchun yetarli uzunlik)
        ReflectionTestUtils.setField(provider, "jwtSecret",
                "z5jURjJwwgWUWXDv367aadjEcpIJ1T3Lwm9bmhkgZT9qn5aU9H2Klb4tSqBGTQtj4emgOgdoDqj/t9P2ioK9cA==");
        ReflectionTestUtils.setField(provider, "jwtExpiration", 3_600_000L);
        ReflectionTestUtils.setField(provider, "refreshExpiration", 86_400_000L);
        provider.init();
    }

    @Test
    @DisplayName("ketma-ket refresh token'lar NOYOB — refresh_token_hash to'qnashmaydi")
    void refreshTokensAreUnique() {
        String a = provider.generateRefreshToken("admin", "STAFF", 1L);
        String b = provider.generateRefreshToken("admin", "STAFF", 1L);
        assertThat(a).isNotEqualTo(b);
    }

    @Test
    @DisplayName("ketma-ket access token'lar ham noyob")
    void accessTokensAreUnique() {
        String a = provider.generateStaffToken("admin", 1L);
        String b = provider.generateStaffToken("admin", 1L);
        assertThat(a).isNotEqualTo(b);
    }

    @Test
    @DisplayName("jti qo'shilishi token'ni buzmaydi (username/userId o'qiladi)")
    void tokenStillParseableAfterJti() {
        String token = provider.generateStaffToken("admin", 42L);
        assertThat(provider.getUsernameFromToken(token)).isEqualTo("admin");
        assertThat(provider.getUserIdFromToken(token)).isEqualTo(42L);
    }
}
