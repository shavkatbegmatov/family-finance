package uz.familyfinance.api.integration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.entity.Account;
import uz.familyfinance.api.entity.Scope;
import uz.familyfinance.api.entity.User;
import uz.familyfinance.api.enums.AccountType;
import uz.familyfinance.api.enums.ScopeType;
import uz.familyfinance.api.repository.AccountRepository;
import uz.familyfinance.api.repository.ScopeRepository;
import uz.familyfinance.api.repository.UserRepository;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Scope izolyatsiyasi integration testi (real PostgreSQL 16) — C1/C3 mexanizmi.
 *
 * Ikki alohida scope'da hisob yaratib, scope-filter agregat (getTotalBalanceByScopeId)
 * FAQAT o'z scope'idagi hisobni hisoblashini tekshiradi — boshqa urug'/xonadon balansi
 * sizib chiqmaydi. Bu C1 (IDOR scope-guard) va C3 (scope-filter agregat) tayanadigan
 * asosiy izolyatsiya mexanizmini real PG'da qulflaydi.
 *
 * @Transactional — har test oxirida rollback (yaratilgan scope/account tozalanadi).
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
@DisplayName("Scope izolyatsiyasi (real PG): agregat faqat o'z scope'ini ko'radi")
class ScopeIsolationIntegrationTest extends AbstractPostgresIntegrationTest {

    @Autowired
    private UserRepository userRepository;
    @Autowired
    private ScopeRepository scopeRepository;
    @Autowired
    private AccountRepository accountRepository;

    private Scope newScope(String name, User owner) {
        return scopeRepository.save(Scope.builder()
                .type(ScopeType.HOUSEHOLD)
                .name(name)
                .ownerUser(owner)
                .build());
    }

    private void newAccount(String name, Scope scope, String balance) {
        accountRepository.save(Account.builder()
                .name(name)
                .type(AccountType.CASH)
                .homeScope(scope)
                .balance(new BigDecimal(balance))
                .build());
    }

    @Test
    @DisplayName("getTotalBalanceByScopeId boshqa scope balansini qo'shmaydi")
    void scopeBalanceIsIsolated() {
        User admin = userRepository.findByUsername("admin").orElseThrow();

        Scope scopeA = newScope("Izolyatsiya A", admin);
        Scope scopeB = newScope("Izolyatsiya B", admin);

        newAccount("Hisob A", scopeA, "100.00");
        newAccount("Hisob B", scopeB, "50.00");

        // Har scope FAQAT o'z hisobini ko'radi — cross-scope sizish yo'q
        assertThat(accountRepository.getTotalBalanceByScopeId(scopeA.getId()))
                .as("scope A faqat o'z hisobini (100) ko'rishi shart")
                .isEqualByComparingTo("100.00");
        assertThat(accountRepository.getTotalBalanceByScopeId(scopeB.getId()))
                .as("scope B faqat o'z hisobini (50) ko'rishi shart")
                .isEqualByComparingTo("50.00");
    }
}
