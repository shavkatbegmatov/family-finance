package uz.familyfinance.api.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import uz.familyfinance.api.dto.request.SavingsGoalRequest;
import uz.familyfinance.api.entity.Account;
import uz.familyfinance.api.entity.SavingsGoal;
import uz.familyfinance.api.entity.Scope;
import uz.familyfinance.api.repository.AccountRepository;
import uz.familyfinance.api.repository.SavingsContributionRepository;
import uz.familyfinance.api.repository.SavingsGoalRepository;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Jamg'arma maqsadiga hisob bog'lash — cross-scope havola guard'i.
 *
 * <p><b>Nima uchun bu test bor:</b> {@code SavingsGoalRequest.accountId} umuman
 * tekshirilmasdi. Foydalanuvchi begona scope'dagi hisob ID'sini yuborib, uni o'z
 * jamg'armasiga bog'lay olardi; javobda esa {@code accountName} qaytadi
 * ({@code toResponse}), ya'ni begona hisob nomi sizardi.</p>
 *
 * <p>Guard mantiqi {@code AccountService.assertCanAccess} da (yagona manba).</p>
 *
 * <p><b>Ma'lum cheklov:</b> {@code AccountService.checkAccess} boshida hali
 * {@code currentUser.isAdmin()} bypass'i bor, shuning uchun global ADMIN rolidagi
 * akkaunt uchun bu guard hech narsa qilmaydi. To'liq yopilishi — S1a
 * ({@code isAdmin()} tozalash).</p>
 *
 * <p>Toza mock'lar (Spring/DB kerak emas) → gating surefire'da ishlaydi.</p>
 */
@DisplayName("SavingsGoal — hisob bog'lash guard'i (cross-scope havola)")
class SavingsGoalAccountGuardTest {

    private static final long FOREIGN_ACCOUNT_ID = 999L;
    private static final long OWN_ACCOUNT_ID = 5L;
    private static final long GOAL_ID = 1L;

    private SavingsGoalRepository savingsGoalRepository;
    private AccountRepository accountRepository;
    private ScopeContextService scopeContext;
    private AccountService accountService;
    private SavingsGoalService service;

    @BeforeEach
    void setUp() {
        savingsGoalRepository = mock(SavingsGoalRepository.class);
        accountRepository = mock(AccountRepository.class);
        scopeContext = mock(ScopeContextService.class);
        accountService = mock(AccountService.class);

        service = new SavingsGoalService(
                savingsGoalRepository,
                mock(SavingsContributionRepository.class),
                accountRepository,
                mock(StaffNotificationService.class),
                scopeContext,
                accountService);

        Scope activeScope = mock(Scope.class);
        when(activeScope.getId()).thenReturn(1L);
        when(scopeContext.getActiveScope()).thenReturn(activeScope);
        doNothing().when(scopeContext).assertCanWrite(anyLong());

        Account foreignAccount = mock(Account.class);
        Account ownAccount = mock(Account.class);
        when(accountRepository.findById(FOREIGN_ACCOUNT_ID)).thenReturn(Optional.of(foreignAccount));
        when(accountRepository.findById(OWN_ACCOUNT_ID)).thenReturn(Optional.of(ownAccount));

        // Begona hisob uchun guard 403 tashlaydi (AccountService xulqini taqlid qiladi)
        doThrow(new AccessDeniedException("Bu hisobga kirish huquqingiz yo'q"))
                .when(accountService).assertCanAccess(foreignAccount);
        doNothing().when(accountService).assertCanAccess(ownAccount);

        // update() uchun mavjud maqsad
        SavingsGoal existing = mock(SavingsGoal.class);
        when(existing.getScope()).thenReturn(activeScope);
        when(existing.getTargetAmount()).thenReturn(new BigDecimal("1000"));
        when(existing.getCurrentAmount()).thenReturn(BigDecimal.ZERO);
        when(savingsGoalRepository.findById(GOAL_ID)).thenReturn(Optional.of(existing));
    }

    private SavingsGoalRequest request(Long accountId) {
        SavingsGoalRequest r = new SavingsGoalRequest();
        r.setName("Test maqsad");
        r.setTargetAmount(new BigDecimal("1000"));
        r.setAccountId(accountId);
        return r;
    }

    @Nested
    @DisplayName("Begona hisob rad etiladi")
    class ForeignAccountDenied {

        @Test
        @DisplayName("create(begona accountId) -> 403, jamg'arma saqlanmaydi")
        void createWithForeignAccountDenied() {
            assertThatThrownBy(() -> service.create(request(FOREIGN_ACCOUNT_ID)))
                    .isInstanceOf(AccessDeniedException.class);
            verify(savingsGoalRepository, never()).save(any());
        }

        @Test
        @DisplayName("update(begona accountId) -> 403, o'zgarish saqlanmaydi")
        void updateWithForeignAccountDenied() {
            assertThatThrownBy(() -> service.update(GOAL_ID, request(FOREIGN_ACCOUNT_ID)))
                    .isInstanceOf(AccessDeniedException.class);
            verify(savingsGoalRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("Guard normal oqimni buzmaydi")
    class NoRegression {

        @Test
        @DisplayName("O'z hisobi bilan create ishlaydi va guard chaqiriladi")
        void createWithOwnAccountPasses() {
            when(savingsGoalRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            service.create(request(OWN_ACCOUNT_ID));

            verify(accountService).assertCanAccess(any());
            verify(savingsGoalRepository).save(any());
        }

        @Test
        @DisplayName("accountId null bo'lsa hisob guard'i umuman chaqirilmaydi")
        void nullAccountIdSkipsGuard() {
            when(savingsGoalRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            service.create(request(null));

            verify(accountService, never()).assertCanAccess(any());
            verify(accountRepository, never()).findById(anyLong());
            verify(savingsGoalRepository).save(any());
        }
    }
}
