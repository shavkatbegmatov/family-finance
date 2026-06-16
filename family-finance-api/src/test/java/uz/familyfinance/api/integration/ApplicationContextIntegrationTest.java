package uz.familyfinance.api.integration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/**
 * To'liq Spring konteksti real PostgreSQL 16'da (Testcontainers) yuklanishini tekshiradi —
 * production boot bilan bir xil yo'l: Flyway migratsiya + Hibernate `ddl-auto=validate`
 * (entity ↔ schema mosligi) + barcha bean'lar wiring.
 *
 * Bu test contextLoads xatolarini (entity/schema drift, buzilgan bean konfiguratsiyasi,
 * yetishmayotgan migratsiya) erta ushlaydi — H2 bunday prod-xos muammolarni yashirardi.
 */
@SpringBootTest
@ActiveProfiles("test")
@DisplayName("Spring konteksti real PostgreSQL'da yuklanadi")
class ApplicationContextIntegrationTest extends AbstractPostgresIntegrationTest {

    @Test
    @DisplayName("to'liq kontekst yuklanadi (Flyway + ddl-auto=validate, prod kabi)")
    void contextLoads() {
        // Kontekst muvaffaqiyatli yuklansa test o'tadi. Hech qanday assertion shart emas —
        // booting'ning o'zi validate (entity↔schema) va migratsiyalarni tasdiqlaydi.
    }
}
