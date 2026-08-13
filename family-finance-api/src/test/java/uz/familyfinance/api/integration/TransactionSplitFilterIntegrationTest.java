package uz.familyfinance.api.integration;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.entity.Account;
import uz.familyfinance.api.entity.Category;
import uz.familyfinance.api.entity.Scope;
import uz.familyfinance.api.entity.Transaction;
import uz.familyfinance.api.entity.TransactionSplit;
import uz.familyfinance.api.entity.User;
import uz.familyfinance.api.enums.AccountType;
import uz.familyfinance.api.enums.CategoryType;
import uz.familyfinance.api.enums.ScopeType;
import uz.familyfinance.api.enums.TransactionStatus;
import uz.familyfinance.api.enums.TransactionType;
import uz.familyfinance.api.repository.AccountRepository;
import uz.familyfinance.api.repository.CategoryRepository;
import uz.familyfinance.api.repository.ScopeRepository;
import uz.familyfinance.api.repository.TransactionRepository;
import uz.familyfinance.api.repository.TransactionSplitRepository;
import uz.familyfinance.api.repository.UserRepository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Kategoriya filtri split ulushlarini ham topishi (real PostgreSQL 16).
 *
 * <p>Split'li tranzaksiya {@code category=null} bilan saqlanadi, ulushlari
 * {@code transaction_splits}'da. {@code findWithFilters}'ning kategoriya sharti
 * EXISTS bilan kengaytirilgan — bu test uchta narsani qulflaydi:</p>
 * <ol>
 *   <li>to'g'ridan kategoriyali VA split ulushli tranzaksiyalar birga topiladi
 *       (boshqa kategoriya esa chiqmaydi);</li>
 *   <li>value/count query muvofiqligi — {@code totalElements} ro'yxat bilan mos
 *       (sahifalash to'g'ri);</li>
 *   <li>filtrsiz ({@code categoryId=null}) xulq o'zgarmagan (regressiya to'ri —
 *       endpoint TransactionsPage bilan ham bo'lishilgan).</li>
 * </ol>
 *
 * @Transactional — har test oxirida rollback.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
@DisplayName("Kategoriya filtri split ulushlarini ham topadi (real PG)")
class TransactionSplitFilterIntegrationTest extends AbstractPostgresIntegrationTest {

    @Autowired
    private UserRepository userRepository;
    @Autowired
    private ScopeRepository scopeRepository;
    @Autowired
    private AccountRepository accountRepository;
    @Autowired
    private CategoryRepository categoryRepository;
    @Autowired
    private TransactionRepository transactionRepository;
    @Autowired
    private TransactionSplitRepository transactionSplitRepository;

    private Scope scope;
    private Account account;
    private Category oziqOvqat;
    private Category transport;

    /** To'g'ridan kategoriyali xarajat. */
    private Transaction directTx;
    /** Split: 30 000 oziq-ovqat + 20 000 transport (category=null). */
    private Transaction splitTx;
    /** Boshqa kategoriyali xarajat — filtrga tushmasligi kerak. */
    private Transaction otherTx;

    @BeforeEach
    void setUp() {
        User admin = userRepository.findByUsername("admin").orElseThrow();
        scope = scopeRepository.save(Scope.builder()
                .type(ScopeType.HOUSEHOLD).name("Split filtr testi").ownerUser(admin).build());
        account = accountRepository.save(Account.builder()
                .name("Split test hisob").type(AccountType.CASH)
                .homeScope(scope).balance(BigDecimal.ZERO).build());
        oziqOvqat = categoryRepository.save(Category.builder()
                .name("Split test oziq-ovqat").type(CategoryType.EXPENSE).build());
        transport = categoryRepository.save(Category.builder()
                .name("Split test transport").type(CategoryType.EXPENSE).build());

        directTx = newExpense(new BigDecimal("15000"), oziqOvqat);
        splitTx = newExpense(new BigDecimal("50000"), null);
        transactionSplitRepository.save(TransactionSplit.builder()
                .transaction(splitTx).category(oziqOvqat).amount(new BigDecimal("30000")).build());
        transactionSplitRepository.save(TransactionSplit.builder()
                .transaction(splitTx).category(transport).amount(new BigDecimal("20000")).build());
        otherTx = newExpense(new BigDecimal("7000"), transport);
    }

    private Transaction newExpense(BigDecimal amount, Category category) {
        return transactionRepository.save(Transaction.builder()
                .type(TransactionType.EXPENSE)
                .amount(amount)
                .account(account)
                .scope(scope)
                .category(category)
                .transactionDate(LocalDateTime.now())
                .status(TransactionStatus.CONFIRMED)
                .isRecurring(false)
                .build());
    }

    private Page<Transaction> filterByCategory(Long categoryId) {
        return transactionRepository.findWithFilters(scope.getId(), TransactionType.EXPENSE,
                null, categoryId, null, null, null, null, null, PageRequest.of(0, 20));
    }

    @Test
    @DisplayName("filtr to'g'ridan kategoriyali VA split ulushli tranzaksiyani topadi, boshqasini emas")
    void categoryFilterIncludesSplitPortions() {
        Page<Transaction> page = filterByCategory(oziqOvqat.getId());

        List<Long> ids = page.getContent().stream().map(Transaction::getId).toList();
        assertThat(ids)
                .as("to'g'ridan (directTx) va split ulushli (splitTx) — ikkalasi ham")
                .containsExactlyInAnyOrder(directTx.getId(), splitTx.getId())
                .doesNotContain(otherTx.getId());
    }

    @Test
    @DisplayName("countQuery value bilan mos — totalElements sahifalash uchun to'g'ri")
    void countQueryMatchesValueQuery() {
        Page<Transaction> page = filterByCategory(oziqOvqat.getId());

        assertThat(page.getTotalElements()).isEqualTo(page.getContent().size()).isEqualTo(2);
    }

    @Test
    @DisplayName("transport filtri ham split ulushini ko'radi (otherTx + splitTx)")
    void otherCategoryAlsoSeesItsPortion() {
        Page<Transaction> page = filterByCategory(transport.getId());

        assertThat(page.getContent().stream().map(Transaction::getId))
                .containsExactlyInAnyOrder(otherTx.getId(), splitTx.getId());
    }

    @Test
    @DisplayName("regressiya: filtrsiz (categoryId=null) barcha 3 tranzaksiya qaytadi")
    void noFilterReturnsAll() {
        Page<Transaction> page = filterByCategory(null);

        assertThat(page.getContent().stream().map(Transaction::getId))
                .containsExactlyInAnyOrder(directTx.getId(), splitTx.getId(), otherTx.getId());
        assertThat(page.getTotalElements()).isEqualTo(3);
    }
}
