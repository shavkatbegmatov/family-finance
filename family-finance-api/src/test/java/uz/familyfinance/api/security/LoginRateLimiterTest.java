package uz.familyfinance.api.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * {@link LoginRateLimiter} — C6 IP-throttle toza-mantiq testlari (Spring/DB'siz).
 */
@DisplayName("LoginRateLimiter (C6 IP throttle)")
class LoginRateLimiterTest {

    private LoginRateLimiter limiter;

    @BeforeEach
    void setUp() {
        limiter = new LoginRateLimiter();
        ReflectionTestUtils.setField(limiter, "enabled", true);
        ReflectionTestUtils.setField(limiter, "maxAttempts", 3);
        ReflectionTestUtils.setField(limiter, "windowSeconds", 60L);
    }

    @Test
    @DisplayName("limitgacha ruxsat, undan keyin rad")
    void allowsUpToLimitThenDenies() {
        assertThat(limiter.allow("1.1.1.1")).isTrue();  // 1
        assertThat(limiter.allow("1.1.1.1")).isTrue();  // 2
        assertThat(limiter.allow("1.1.1.1")).isTrue();  // 3
        assertThat(limiter.allow("1.1.1.1")).isFalse(); // 4 — limit oshib ketdi
    }

    @Test
    @DisplayName("har IP mustaqil hisoblanadi")
    void keysAreIndependent() {
        for (int i = 0; i < 3; i++) {
            limiter.allow("1.1.1.1");
        }
        assertThat(limiter.allow("1.1.1.1")).isFalse();
        assertThat(limiter.allow("2.2.2.2")).isTrue(); // boshqa IP — alohida oyna
    }

    @Test
    @DisplayName("enabled=false — har doim ruxsat (o'chirib qo'yiladi)")
    void disabledAlwaysAllows() {
        ReflectionTestUtils.setField(limiter, "enabled", false);
        for (int i = 0; i < 10; i++) {
            assertThat(limiter.allow("1.1.1.1")).isTrue();
        }
    }

    @Test
    @DisplayName("null/bo'sh key — ruxsat (NPE emas)")
    void nullOrBlankKeyAllowed() {
        assertThat(limiter.allow(null)).isTrue();
        assertThat(limiter.allow("")).isTrue();
    }
}
