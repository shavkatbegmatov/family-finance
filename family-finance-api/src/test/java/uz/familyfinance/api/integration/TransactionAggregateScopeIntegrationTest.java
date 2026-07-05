package uz.familyfinance.api.integration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.entity.Account;
import uz.familyfinance.api.entity.Scope;
import uz.familyfinance.api.entity.Transaction;
import uz.familyfinance.api.entity.User;
import uz.familyfinance.api.enums.AccountType;
import uz.familyfinance.api.enums.ScopeType;
import uz.familyfinance.api.enums.TransactionStatus;
import uz.familyfinance.api.enums.TransactionType;
import uz.familyfinance.api.repository.AccountRepository;
import uz.familyfinance.api.repository.ScopeRepository;
import uz.familyfinance.api.repository.TransactionRepository;
import uz.familyfinance.api.repository.UserRepository;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * D1-c: Dashboard/Report transaction agregatlari scope izolyatsiyasi (real PostgreSQL 16).
 *
 * Agregat query'lar (Dashboard/Report ishlatadigan) endi {@code t.scope.id} bo'yicha
 * filtrlaydi (avval {@code t.account.familyGroup.id} = klan-keng edi). Bu test agregat
 * scope-aniqligini qulflaydi: {@code sumByTypeAndDateRangeAndScope} FAQAT berilgan scope
 * tranzaksiyalarini qo'shadi — boshqa urug'/xonadon summasi sizib chiqmaydi (dashboard
 * raqamlari endi scope-aniq list bilan izchil).
 *
 * @Transactional — har test oxirida rollback.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
@DisplayName("Tranzaksiya agregat scope izolyatsiyasi (real PG): sum*AndScope faqat o'z scope'i (D1-c)")
class TransactionAggregateScopeIntegrationTest extends AbstractPostgresIntegrationTest {

    @Autowired
    private UserRepository userRepository;
    @Autowired
    private ScopeRepository scopeRepository;
    @Autowired
    private AccountRepository accountRepository;
    @Autowired
    private TransactionRepository transactionRepository;

    private Scope newClan(String name, User owner) {
        return scopeRepository.save(Scope.builder()
                .type(ScopeType.HOUSEHOLD).name(name).ownerUser(owner).build());
    }

    private void income(Scope scope, String amount) {
        Account account = accountRepository.save(Account.builder()
                .name("Hisob " + scope.getName())
                .type(AccountType.CASH)
                .homeScope(scope)
                .balance(BigDecimal.ZERO)
                .build());
        transactionRepository.save(Transaction.builder()
                .type(TransactionType.INCOME)
                .amount(new BigDecimal(amount))
                .account(account)
                .scope(scope)
                .transactionDate(LocalDateTime.now())
                .status(TransactionStatus.CONFIRMED)
                .isRecurring(false)
                .build());
    }

    @Test
    @DisplayName("sumByTypeAndDateRangeAndScope faqat o'sha scope summasini qo'shadi (cross-scope sizish yo'q)")
    void aggregateIsolatesByScope() {
        User admin = userRepository.findByUsername("admin").orElseThrow();
        Scope scopeA = newClan("Agregat A", admin);
        Scope scopeB = newClan("Agregat B", admin);
        income(scopeA, "100.00");
        income(scopeB, "50.00");

        LocalDateTime from = LocalDateTime.now().minusDays(1);
        LocalDateTime to = LocalDateTime.now().plusDays(1);

        assertThat(transactionRepository.sumByTypeAndDateRangeAndScope(
                TransactionType.INCOME, from, to, scopeA.getId()))
                .as("scope A faqat o'z daromadini (100) ko'rishi shart")
                .isEqualByComparingTo("100.00");

        assertThat(transactionRepository.sumByTypeAndDateRangeAndScope(
                TransactionType.INCOME, from, to, scopeB.getId()))
                .as("scope B faqat o'z daromadini (50) ko'rishi shart")
                .isEqualByComparingTo("50.00");
    }
}
