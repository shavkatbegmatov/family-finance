package uz.familyfinance.api.integration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
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
 * D1-b: tranzaksiya ro'yxati scope izolyatsiyasi (real PostgreSQL 16) — read-path cutover.
 *
 * {@code findWithFilters} endi {@code t.scope.id} bo'yicha filtrlaydi (avval
 * {@code t.account.familyGroup.id} = klan-keng edi). Bu test scope-aniqlikni qulflaydi:
 * berilgan scope filtri FAQAT o'sha scope tranzaksiyalarini qaytaradi (boshqa urug'/xonadon
 * tranzaksiyasi sizib chiqmaydi); {@code scopeId=null} (SUPER_ADMIN) esa hammasini ko'radi.
 *
 * @Transactional — har test oxirida rollback.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
@DisplayName("Tranzaksiya scope izolyatsiyasi (real PG): findWithFilters faqat o'z scope'ini ko'radi (D1-b)")
class TransactionScopeIsolationIntegrationTest extends AbstractPostgresIntegrationTest {

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
                .type(ScopeType.CLAN).name(name).ownerUser(owner).build());
    }

    private Transaction newTransactionInScope(Scope scope) {
        Account account = accountRepository.save(Account.builder()
                .name("Hisob " + scope.getName())
                .type(AccountType.CASH)
                .homeScope(scope)
                .balance(BigDecimal.ZERO)
                .build());
        return transactionRepository.save(Transaction.builder()
                .type(TransactionType.INCOME)
                .amount(new BigDecimal("100.00"))
                .account(account)
                .scope(scope)
                .transactionDate(LocalDateTime.now())
                .status(TransactionStatus.CONFIRMED)
                .isRecurring(false)
                .build());
    }

    private Page<Transaction> filterByScope(Long scopeId) {
        return transactionRepository.findWithFilters(
                scopeId, null, null, null, null, null, null, null, null, PageRequest.of(0, 50));
    }

    @Test
    @DisplayName("findWithFilters(scopeId) faqat o'sha scope tranzaksiyalarini qaytaradi (cross-scope sizish yo'q)")
    void filterIsolatesByScope() {
        User admin = userRepository.findByUsername("admin").orElseThrow();
        Scope scopeA = newClan("Tx izolyatsiya A", admin);
        Scope scopeB = newClan("Tx izolyatsiya B", admin);
        Transaction txA = newTransactionInScope(scopeA);
        Transaction txB = newTransactionInScope(scopeB);

        assertThat(filterByScope(scopeA.getId()).getContent())
                .extracting(Transaction::getId)
                .as("scope A faqat o'z tranzaksiyasini ko'rishi shart")
                .contains(txA.getId())
                .doesNotContain(txB.getId());

        assertThat(filterByScope(scopeB.getId()).getContent())
                .extracting(Transaction::getId)
                .as("scope B faqat o'z tranzaksiyasini ko'rishi shart")
                .contains(txB.getId())
                .doesNotContain(txA.getId());
    }

    @Test
    @DisplayName("scopeId=null (SUPER_ADMIN) ikkala scope tranzaksiyasini ham ko'radi")
    void nullScopeSeesAll() {
        User admin = userRepository.findByUsername("admin").orElseThrow();
        Scope scopeA = newClan("Tx hammasi A", admin);
        Scope scopeB = newClan("Tx hammasi B", admin);
        Transaction txA = newTransactionInScope(scopeA);
        Transaction txB = newTransactionInScope(scopeB);

        assertThat(filterByScope(null).getContent())
                .extracting(Transaction::getId)
                .as("scopeId=null global — ikkala tranzaksiya ham ko'rinadi")
                .contains(txA.getId(), txB.getId());
    }
}
