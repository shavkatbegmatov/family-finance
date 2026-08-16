package uz.familyfinance.api.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import uz.familyfinance.api.dto.request.TransactionRequest;
import uz.familyfinance.api.entity.Account;
import uz.familyfinance.api.entity.Scope;
import uz.familyfinance.api.entity.Transaction;
import uz.familyfinance.api.enums.AccountStatus;
import uz.familyfinance.api.enums.AccountType;
import uz.familyfinance.api.enums.ScopeType;
import uz.familyfinance.api.enums.TransactionStatus;
import uz.familyfinance.api.enums.TransactionType;
import uz.familyfinance.api.repository.AccountRepository;
import uz.familyfinance.api.repository.BudgetAlertRepository;
import uz.familyfinance.api.repository.BudgetRepository;
import uz.familyfinance.api.repository.CategoryRepository;
import uz.familyfinance.api.repository.FamilyMemberRepository;
import uz.familyfinance.api.repository.TransactionRepository;
import uz.familyfinance.api.repository.TransactionSplitRepository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Tranzaksiya UPDATE'da scope hisob bilan birga ko'chadi (F2).
 *
 * <p><b>Nima uchun bu test bor:</b> {@code update()} da {@code existing.setAccount(account)}
 * bor edi, lekin {@code setScope(...)} YO'Q — holbuki CREATE'da
 * {@code .scope(account.getHomeScope())} yoziladi. Natijada tranzaksiyani boshqa xonadon
 * hisobiga ko'chirganda {@code scope_id} ESKI qolib ketardi va scope-filtrlangan
 * hisobotlar/agregatlar uni noto'g'ri xonadonga sanardi.</p>
 *
 * <p>Bu IDOR emas — {@code assertCanModify} ikkala hisob uchun ham chaqiriladi, ya'ni
 * foydalanuvchi ikkala scope'ga a'zo bo'lishi shart. Bu <b>ma'lumot izchilligi</b> bug'i.</p>
 *
 * <p>Real entity'lar + mock repository'lar: {@code toResponse} to'liq null-safe, shuning
 * uchun servisni chaqirib yakuniy holatni tekshirish mumkin.</p>
 */
@DisplayName("Tranzaksiya UPDATE — scope hisob bilan ko'chadi (F2)")
class TransactionUpdateScopeTest {

    private static final long TX_ID = 1L;
    private static final long OLD_ACCOUNT_ID = 10L;
    private static final long NEW_ACCOUNT_ID = 20L;

    private TransactionRepository transactionRepository;
    private AccountRepository accountRepository;
    private AccountService accountService;
    private TransactionService service;

    private Scope oldScope;
    private Scope newScope;
    private Account oldAccount;
    private Account newAccount;
    private Transaction existing;

    @BeforeEach
    void setUp() {
        transactionRepository = mock(TransactionRepository.class);
        accountRepository = mock(AccountRepository.class);
        accountService = mock(AccountService.class);

        service = new TransactionService(
                transactionRepository,
                accountRepository,
                mock(CategoryRepository.class),
                mock(FamilyMemberRepository.class),
                mock(BudgetRepository.class),
                mock(BudgetAlertRepository.class),
                mock(StaffNotificationService.class),
                accountService,
                mock(TagService.class),
                mock(TransactionSplitRepository.class),
                mock(ScopeContextService.class));

        oldScope = scope(1L, "Eski xonadon");
        newScope = scope(2L, "Yangi xonadon");
        oldAccount = account(OLD_ACCOUNT_ID, oldScope);
        newAccount = account(NEW_ACCOUNT_ID, newScope);

        existing = Transaction.builder()
                .type(TransactionType.INCOME)
                .amount(new BigDecimal("100.00"))
                .account(oldAccount)
                .scope(oldScope)
                .transactionDate(LocalDateTime.now().minusDays(1))
                .status(TransactionStatus.CONFIRMED)
                .build();
        existing.setId(TX_ID);

        when(transactionRepository.findById(TX_ID)).thenReturn(Optional.of(existing));
        when(transactionRepository.save(existing)).thenReturn(existing);
        when(accountRepository.findById(NEW_ACCOUNT_ID)).thenReturn(Optional.of(newAccount));
        // INCOME double-entry uchun transit hisob (resolveDebitCredit ichida)
        when(accountService.findTransitAccount(anyString(), anyBoolean()))
                .thenReturn(account(99L, null));
    }

    private Scope scope(Long id, String name) {
        Scope s = Scope.builder().type(ScopeType.HOUSEHOLD).name(name).build();
        s.setId(id);
        return s;
    }

    private Account account(Long id, Scope homeScope) {
        Account a = Account.builder()
                .name("Hisob " + id)
                .type(AccountType.CASH)
                .currency("UZS")
                .balance(BigDecimal.ZERO)
                .status(AccountStatus.ACTIVE)
                .homeScope(homeScope)
                .build();
        a.setId(id);
        return a;
    }

    private TransactionRequest updateToNewAccount() {
        TransactionRequest r = new TransactionRequest();
        r.setType(TransactionType.INCOME);
        r.setAmount(new BigDecimal("100.00"));
        r.setAccountId(NEW_ACCOUNT_ID);
        r.setTransactionDate(LocalDateTime.now());
        r.setDescription("Boshqa xonadon hisobiga ko'chirildi");
        return r;
    }

    @Test
    @DisplayName("Hisob boshqa xonadonga o'zgartirilsa scope ham yangilanadi")
    void scopeFollowsAccountOnUpdate() {
        assertThat(existing.getScope()).isEqualTo(oldScope); // boshlang'ich holat

        service.update(TX_ID, updateToNewAccount());

        assertThat(existing.getAccount()).isEqualTo(newAccount);
        assertThat(existing.getScope())
                .as("scope hisob bilan birga ko'chishi kerak (CREATE bilan izchil)")
                .isEqualTo(newScope);
    }

    @Test
    @DisplayName("Scope'siz hisobga (SYSTEM_TRANSIT) ko'chirilsa scope null bo'ladi")
    void scopeBecomesNullForScopelessAccount() {
        Account scopeless = account(30L, null);
        when(accountRepository.findById(30L)).thenReturn(Optional.of(scopeless));

        TransactionRequest r = updateToNewAccount();
        r.setAccountId(30L);
        service.update(TX_ID, r);

        assertThat(existing.getScope())
                .as("scope'siz hisob uchun transactions.scope_id NULL (D1 dizayni)")
                .isNull();
    }
}
