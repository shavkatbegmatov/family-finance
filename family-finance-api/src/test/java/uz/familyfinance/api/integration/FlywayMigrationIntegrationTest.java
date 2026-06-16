package uz.familyfinance.api.integration;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.output.MigrateResult;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Birinchi integration test (Testcontainers poydevori, Faza 0).
 *
 * Barcha Flyway migratsiyalari (V1..V46) TOZA, real PostgreSQL 16 bazasida xatosiz
 * qo'llanishini tekshiradi — H2 emas (prod PostgreSQL'ga xos SQL/tip xatolari H2'da
 * yashirinib qolardi). Spring konteksti BOOT QILINMAYDI (faqat Flyway + JDBC) — shuning
 * uchun JWT/card secret yoki bean-wiring kerak emas, mo'rtlik minimal.
 *
 * Docker kerak (CI'da bor; lokal mashinada Docker bo'lmasa o'tkazib yuboriladi emas —
 * shuning uchun bu test gate-qilmaydigan ALOHIDA CI job'da ishlaydi, surefire gating
 * run'dan `*IntegrationTest` exclude qilingan).
 */
@Testcontainers
@DisplayName("Flyway migratsiyalari (real PostgreSQL 16)")
class FlywayMigrationIntegrationTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:16-alpine");

    @Test
    @DisplayName("barcha V* migratsiyalar toza bazada xatosiz va idempotent qo'llanadi")
    void allMigrationsApplyCleanly() {
        Flyway flyway = Flyway.configure()
                .dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
                .locations("classpath:db/migration")
                .baselineOnMigrate(true)
                .load();

        MigrateResult result = flyway.migrate();

        assertThat(result.success).isTrue();
        assertThat(result.migrationsExecuted).isGreaterThan(0);

        // Idempotentlik: ikkinchi marta migrate hech qanday yangi migratsiya qo'llamaydi
        // (barcha versiyalar allaqachon qo'llangan → pending yo'q).
        MigrateResult second = flyway.migrate();
        assertThat(second.migrationsExecuted).isZero();
    }
}
