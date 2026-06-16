package uz.familyfinance.api.integration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;
import uz.familyfinance.api.entity.Transaction;
import uz.familyfinance.api.repository.TransactionRepository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

/**
 * CAST/bytea regressiya testi (Faza 1) — real PostgreSQL 16.
 *
 * Nullable String JPQL parametrlari PostgreSQL'da `CAST(:param AS string)` bilan o'ralishi
 * SHART — aks holda Hibernate ularni `bytea` sifatida bind qiladi va `lower(bytea)` xatosi
 * yuzaga keladi. Bu loyihada TAKRORLANUVCHI bug edi. H2 bu xatoni YASHIRADI (faqat real
 * PostgreSQL reproduksiya qiladi) — shuning uchun bu integration test.
 *
 * TransactionRepository.findWithFilters barcha filtri null bo'lsa ham xatosiz ishlashi kerak.
 */
@SpringBootTest
@ActiveProfiles("test")
@DisplayName("CAST/bytea regressiya (real PG): null filtrlar lower(bytea) bermaydi")
class CastByteaRegressionIntegrationTest extends AbstractPostgresIntegrationTest {

    @Autowired
    private TransactionRepository transactionRepository;

    @Test
    @DisplayName("findWithFilters barcha null parametr bilan bytea xatosiz ishlaydi")
    void findWithFiltersWithAllNullParams() {
        assertThatCode(() -> {
            Page<Transaction> page = transactionRepository.findWithFilters(
                    null, // familyGroupId
                    null, // type
                    null, // accountId
                    null, // categoryId
                    null, // memberId
                    null, // fromDate
                    null, // toDate
                    null, // status
                    null, // search (CAST(:search AS string) — bytea regressiya manbai)
                    PageRequest.of(0, 10));
            assertThat(page).isNotNull();
        }).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("findWithFilters bo'sh bo'lmagan search bilan ham ishlaydi (LOWER LIKE)")
    void findWithFiltersWithSearchTerm() {
        assertThatCode(() ->
                transactionRepository.findWithFilters(
                        null, null, null, null, null, null, null, null,
                        "test-qidiruv-matni",
                        PageRequest.of(0, 10))
        ).doesNotThrowAnyException();
    }
}
