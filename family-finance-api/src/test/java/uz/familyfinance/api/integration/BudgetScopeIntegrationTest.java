package uz.familyfinance.api.integration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import uz.familyfinance.api.repository.BudgetRepository;
import uz.familyfinance.api.repository.TransactionRepository;
import uz.familyfinance.api.repository.TransactionSplitRepository;

import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

/**
 * C3 scope-filter agregatlari uchun integration testi (real PostgreSQL 16).
 *
 * Asosiy maqsad: yangi scope-aware JPQL/derived query'lar real PostgreSQL'da XATOSIZ
 * bajarilishini tekshirish — `t.account.homeScope.id` field-path va derived-query
 * (findBy...ScopeId...) bootstrap/runtime'da yaroqli ekanini qulflaydi. Noto'g'ri yo'l
 * yoki tip H2'da yashirinardi; bu test prod'ga chiqishdan oldin ushlaydi.
 *
 * (To'liq cross-tenant assertion ko'p-scope ma'lumot setup'ini talab qiladi — keyingi qadam;
 * bu yerda kritik risk = JPQL yaroqliligi qoplanadi.)
 */
@SpringBootTest
@ActiveProfiles("test")
@DisplayName("C3: scope-aware agregat query'lar real PG'da ishlaydi")
class BudgetScopeIntegrationTest extends AbstractPostgresIntegrationTest {

    @Autowired
    private TransactionRepository transactionRepository;
    @Autowired
    private TransactionSplitRepository transactionSplitRepository;
    @Autowired
    private BudgetRepository budgetRepository;

    @Test
    @DisplayName("scoped sum/lookup query'lar JPQL xatosisiz bajariladi (bo'sh natija ham OK)")
    void scopedQueriesExecuteAgainstRealPostgres() {
        LocalDateTime from = LocalDateTime.now().minusDays(30);
        LocalDateTime to = LocalDateTime.now();
        LocalDate today = LocalDate.now();

        assertThatCode(() -> {
            // 1) Transaction scoped sum (account.homeScope.id field-path tekshiruvi)
            assertThat(transactionRepository
                    .sumExpenseByCategoryAndScopeAndDateRange(1L, 1L, from, to)).isNotNull();
            // 2) TransactionSplit scoped sum (transaction.account.homeScope.id)
            assertThat(transactionSplitRepository
                    .sumExpenseByCategoryAndScopeAndDateRange(1L, 1L, from, to)).isNotNull();
            // 3) Budget scope-aware derived lookup (findBy...ScopeId... yaroqli)
            assertThat(budgetRepository
                    .findByCategoryIdAndScopeIdAndIsActiveTrueAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                            1L, 1L, today, today)).isNotNull(); // Optional, hech qachon null emas
        }).doesNotThrowAnyException();
    }
}
