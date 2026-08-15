package uz.familyfinance.api.integration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;
import uz.familyfinance.api.entity.Transaction;
import uz.familyfinance.api.repository.AuditLogRepository;
import uz.familyfinance.api.repository.DebtRepository;
import uz.familyfinance.api.repository.TransactionRepository;

import java.util.Set;

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
 * <p><b>Qamrov (2026-08-16 kengaytirildi):</b> avval faqat {@code TransactionRepository}
 * tekshirilardi. Auditda {@code DebtRepository} va {@code AuditLogRepository}'da ham
 * CAST'siz nullable String parametrlar topildi. Ular haqiqatan yiqiladimi — nazariy bahs
 * emas, SHU TEST javob beradi: yashil bo'lsa CAST kerak emas (Hibernate turni
 * {@code LIKE CONCAT(...)} yoki {@code = :param} taqqoslashidan aniqlaydi), qizil bo'lsa
 * aynan yiqilgan query'ga CAST qo'shiladi.</p>
 *
 * <p>Ikkala holatda ham testlar qoladi — CAST qo'shilsa regressiya himoyasi bo'ladi,
 * qo'shilmasa "bu query xavfsiz" degan qulf bo'ladi.</p>
 */
@SpringBootTest
@ActiveProfiles("test")
@DisplayName("CAST/bytea regressiya (real PG): null filtrlar lower(bytea) bermaydi")
class CastByteaRegressionIntegrationTest extends AbstractPostgresIntegrationTest {

    /** Bo'sh bo'lmagan scope to'plami — {@code IN ()} bo'sh bo'lsa SQL'ning o'zi yiqiladi. */
    private static final Set<Long> ANY_SCOPE_IDS = Set.of(1L);

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private DebtRepository debtRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

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

    // ====================================================================
    // DebtRepository — CAST'siz nullable String (:search)
    // Naqsh farqi: bu yerda LIKE CONCAT(...) `:search IS NULL` dan OLDIN keladi,
    // CAST qo'shilgan AccountRepository'da esa IS NULL birinchi. Hibernate turni
    // CONCAT'dan aniqlay olsa — CAST kerak emas.
    // ====================================================================

    @Test
    @DisplayName("Debt.findWithFilters barcha null parametr bilan bytea xatosiz ishlaydi")
    void debtFindWithFiltersAllNullParams() {
        assertThatCode(() -> {
            Page<?> page = debtRepository.findWithFilters(
                    null, // type
                    null, // status
                    null, // search — CAST'siz nullable String
                    PageRequest.of(0, 10));
            assertThat(page).isNotNull();
        }).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("Debt.findWithFiltersAndScopeIds null search bilan ishlaydi")
    void debtFindWithFiltersAndScopeIdsNullSearch() {
        assertThatCode(() ->
                debtRepository.findWithFiltersAndScopeIds(
                        ANY_SCOPE_IDS, null, null, null, PageRequest.of(0, 10))
        ).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("Debt.findWithFiltersAndScopeIds bo'sh bo'lmagan search bilan ishlaydi")
    void debtFindWithFiltersAndScopeIdsWithSearch() {
        assertThatCode(() ->
                debtRepository.findWithFiltersAndScopeIds(
                        ANY_SCOPE_IDS, null, null, "test-qarzdor", PageRequest.of(0, 10))
        ).doesNotThrowAnyException();
    }

    // ====================================================================
    // AuditLogRepository — CAST'siz nullable String (:entityType, :action, :search)
    // Bu yerda `:param IS NULL` BIRINCHI keladi — ya'ni AccountRepository'dagi
    // (CAST qo'shilishi kerak bo'lgan) naqsh bilan bir xil. Eng shubhali guruh.
    // ====================================================================

    @Test
    @DisplayName("AuditLog.filterAuditLogs barcha null parametr bilan ishlaydi")
    void auditFilterAuditLogsAllNullParams() {
        assertThatCode(() ->
                auditLogRepository.filterAuditLogs(null, null, null, PageRequest.of(0, 10))
        ).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("AuditLog.searchAuditLogs null entityType/action + search bilan ishlaydi")
    void auditSearchAuditLogsNullFiltersWithSearch() {
        // AuditLogService search null bo'lsa filterAuditLogs'ga o'tadi, ya'ni bu query
        // doim non-null search bilan chaqiriladi — lekin entityType/action null bo'lishi mumkin.
        assertThatCode(() ->
                auditLogRepository.searchAuditLogs(null, null, null, "admin", PageRequest.of(0, 10))
        ).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("AuditLog.findUncorrelatedLogs barcha null parametr bilan ishlaydi")
    void auditFindUncorrelatedLogsAllNullParams() {
        assertThatCode(() ->
                auditLogRepository.findUncorrelatedLogs(null, null, null, PageRequest.of(0, 10))
        ).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("AuditLog.countUncorrelatedLogs barcha null parametr bilan ishlaydi")
    void auditCountUncorrelatedLogsAllNullParams() {
        assertThatCode(() ->
                auditLogRepository.countUncorrelatedLogs(null, null, null)
        ).doesNotThrowAnyException();
    }

    // --- Native SQL: Postgres parametr turini o'zi aniqlay olmaydi (eng yuqori xavf) ---

    @Test
    @DisplayName("AuditLog.findDistinctCorrelationIds (native) barcha null parametr bilan ishlaydi")
    void auditFindDistinctCorrelationIdsAllNullParams() {
        assertThatCode(() ->
                auditLogRepository.findDistinctCorrelationIds(null, null, null)
        ).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("AuditLog.countDistinctCorrelationIds (native) barcha null parametr bilan ishlaydi")
    void auditCountDistinctCorrelationIdsAllNullParams() {
        assertThatCode(() ->
                auditLogRepository.countDistinctCorrelationIds(null, null, null)
        ).doesNotThrowAnyException();
    }
}
