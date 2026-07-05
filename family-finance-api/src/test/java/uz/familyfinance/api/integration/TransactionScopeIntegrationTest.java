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
 * D1-a: {@code transactions.scope_id} (V48) — ustun + entity mapping round-trip (real PostgreSQL 16).
 *
 * Bu PR ADDITIVE: tranzaksiyaga to'g'ridan scope qo'shadi (read-path query cutover PR-b da).
 * Test: (1) {@code scope} maydoni real PG'da yoziladi/o'qiladi → V48 ustuni va entity mapping
 * mos (ddl-auto=validate o'tadi); (2) scope NULLABLE — system/SYSTEM_TRANSIT (scope'siz account)
 * tranzaksiyasi NULL scope bilan saqlanadi (V39 accounts'ni shu sabab NOT NULL'dan istisno qilgan).
 *
 * @Transactional — har test oxirida rollback.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
@DisplayName("transactions.scope_id (real PG): V48 ustun + nullable scope mapping")
class TransactionScopeIntegrationTest extends AbstractPostgresIntegrationTest {

    @Autowired
    private UserRepository userRepository;
    @Autowired
    private ScopeRepository scopeRepository;
    @Autowired
    private AccountRepository accountRepository;
    @Autowired
    private TransactionRepository transactionRepository;

    private Account newAccount(String name, Scope scope, AccountType type) {
        return accountRepository.save(Account.builder()
                .name(name)
                .type(type)
                .homeScope(scope)
                .balance(BigDecimal.ZERO)
                .build());
    }

    private Transaction newTransaction(Account account) {
        // doCreate'dagidek: tranzaksiya scope'i = asosiy hisob homeScope'i
        return transactionRepository.save(Transaction.builder()
                .type(TransactionType.INCOME)
                .amount(new BigDecimal("100.00"))
                .account(account)
                .scope(account.getHomeScope())
                .transactionDate(LocalDateTime.now())
                .status(TransactionStatus.CONFIRMED)
                .isRecurring(false)
                .build());
    }

    @Test
    @DisplayName("scope_id yoziladi va o'qiladi (entity ↔ V48 ustun mapping)")
    void scopePersistsAndLoads() {
        User admin = userRepository.findByUsername("admin").orElseThrow();
        Scope clan = scopeRepository.save(Scope.builder()
                .type(ScopeType.HOUSEHOLD).name("D1 test urug'i").ownerUser(admin).build());
        Account account = newAccount("D1 hisob", clan, AccountType.CASH);

        Transaction saved = newTransaction(account);

        Transaction loaded = transactionRepository.findById(saved.getId()).orElseThrow();
        assertThat(loaded.getScope())
                .as("scope_id backfill/write-path orqali to'lishi kerak")
                .isNotNull();
        assertThat(loaded.getScope().getId()).isEqualTo(clan.getId());
    }

    @Test
    @DisplayName("scope NULLABLE — scope'siz (SYSTEM_TRANSIT) account tranzaksiyasi NULL scope bilan saqlanadi")
    void scopeIsNullableForScopelessAccount() {
        // homeScope=null (SYSTEM_TRANSIT global hisob kabi)
        Account systemAccount = newAccount("System tranzit", null, AccountType.SYSTEM_TRANSIT);

        Transaction saved = newTransaction(systemAccount);

        Transaction loaded = transactionRepository.findById(saved.getId()).orElseThrow();
        assertThat(loaded.getScope())
                .as("system/SYSTEM_TRANSIT tranzaksiya scope'siz bo'lishi mumkin (NOT NULL EMAS)")
                .isNull();
    }
}
