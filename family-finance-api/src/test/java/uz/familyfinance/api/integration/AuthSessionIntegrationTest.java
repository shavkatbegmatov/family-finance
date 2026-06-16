package uz.familyfinance.api.integration;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import uz.familyfinance.api.dto.request.LoginRequest;
import uz.familyfinance.api.dto.response.JwtResponse;
import uz.familyfinance.api.repository.SessionRepository;
import uz.familyfinance.api.repository.UserRepository;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Auth oqimi integration testi (Faza 1, behavior qulflash) — real PostgreSQL 16.
 *
 * Seed (V4) admin/admin123 bilan kirish DB Session yaratishini va refresh yangi
 * token berishini tekshiradi (V44 session-per-token invariantining neti). Bu
 * keyingi C5 (refresh-token turi) tuzatishi uchun xavfsizlik to'ri.
 *
 * DIQQAT: ataylab "eski refresh token rad etiladi" QULFLANMAYDI — aynan shu C5'da
 * o'zgaradi (hozir rotateSession fallback bor). Hozir faqat barqaror xatti-harakat.
 */
@SpringBootTest
@ActiveProfiles("test")
@DisplayName("Auth: login -> Session, refresh -> yangi token (real PG)")
class AuthSessionIntegrationTest extends AbstractPostgresIntegrationTest {

    private static final String ADMIN = "admin";
    private static final String ADMIN_PWD = "admin123"; // V4 seed (V46 faqat must_change flag)
    private static final String IP = "127.0.0.1";
    private static final String UA = "JUnit-integration-test";

    @Autowired
    private uz.familyfinance.api.service.AuthService authService;
    @Autowired
    private SessionRepository sessionRepository;
    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void cleanSessions() {
        // Test izolyatsiyasi: admin refresh-token bir soniya ichida deterministik bo'lgani
        // uchun ketma-ket login'lar idx_sessions_refresh_token_hash unique constraint'ini
        // buzadi. Har testdan oldin sessiyalarni tozalaymiz.
        sessionRepository.deleteAll();
    }

    private LoginRequest adminLogin() {
        LoginRequest req = new LoginRequest();
        req.setUsername(ADMIN);
        req.setPassword(ADMIN_PWD);
        return req;
    }

    @Test
    @DisplayName("login token qaytaradi va DB Session yaratadi")
    void loginCreatesSession() {
        JwtResponse res = authService.login(adminLogin(), IP, UA);

        assertThat(res.getAccessToken()).isNotBlank();
        assertThat(res.getRefreshToken()).isNotBlank();

        Long adminId = userRepository.findByUsername(ADMIN).orElseThrow().getId();
        assertThat(sessionRepository.findActiveSessionsByUserId(adminId))
                .as("login'dan keyin faol Session bo'lishi shart (V44)")
                .isNotEmpty();
    }

    @Test
    @DisplayName("refresh yangi (bo'sh bo'lmagan) token beradi va faol Session qoladi")
    void refreshProducesValidTokens() {
        JwtResponse first = authService.login(adminLogin(), IP, UA);

        JwtResponse refreshed = authService.refreshToken(first.getRefreshToken(), IP, UA);

        assertThat(refreshed.getAccessToken()).isNotBlank();
        assertThat(refreshed.getRefreshToken()).isNotBlank();

        Long adminId = userRepository.findByUsername(ADMIN).orElseThrow().getId();
        assertThat(sessionRepository.findActiveSessionsByUserId(adminId))
                .as("refresh'dan keyin ham faol Session bo'lishi shart")
                .isNotEmpty();
    }
}
