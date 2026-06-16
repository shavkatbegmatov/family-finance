package uz.familyfinance.api.integration;

import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;

/**
 * Spring-asoslangan integration testlar uchun umumiy baza.
 *
 * BITTA (singleton) real PostgreSQL 16 konteyneri butun test JVM'i uchun bir marta
 * ko'tariladi (static blok) va barcha test klasslari uni qayta ishlatadi — har klass
 * uchun qayta ko'tarilmaydi (tezroq). Konteyner JVM tugaganda Testcontainers (Ryuk)
 * tomonidan tozalanadi.
 *
 * Datasource va fail-fast secret placeholder'lari (jwt.secret, card-encryption.key)
 * dinamik ulanadi. Testlar `@ActiveProfiles("test")` bilan ishlaydi — application-dev.yml
 * (qattiq kodlangan localhost datasource) yuklanmaydi.
 *
 * Docker kerak (CI'da bor; lokal Docker bo'lmasa ishlamaydi → *IntegrationTest gating
 * surefire run'dan exclude, alohida CI job'da ishlaydi).
 */
public abstract class AbstractPostgresIntegrationTest {

    static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:16-alpine");

    static {
        POSTGRES.start();
    }

    @DynamicPropertySource
    static void registerProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        // Dev-only dummy secret'lar — fail-fast ${JWT_SECRET}/${CARD_ENCRYPTION_KEY}
        // placeholder'larini qondirish uchun (test-only, haqiqiy sir emas).
        registry.add("jwt.secret", () ->
                "z5jURjJwwgWUWXDv367aadjEcpIJ1T3Lwm9bmhkgZT9qn5aU9H2Klb4tSqBGTQtj4emgOgdoDqj/t9P2ioK9cA==");
        // DIQQAT: property yo'li `app.card-encryption.key` (app: parent ostida) —
        // CardEncryptionService @Value("${app.card-encryption.key}") o'qiydi.
        registry.add("app.card-encryption.key", () -> "dev-only-card-key-32-characters!");
    }
}
