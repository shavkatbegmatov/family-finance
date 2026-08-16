package uz.familyfinance.api.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import uz.familyfinance.api.dto.request.PointConversionRequest;
import uz.familyfinance.api.dto.request.TransactionRequest;
import uz.familyfinance.api.entity.Account;
import uz.familyfinance.api.entity.PointBalance;
import uz.familyfinance.api.entity.PointConfig;
import uz.familyfinance.api.entity.PointParticipant;
import uz.familyfinance.api.entity.Scope;
import uz.familyfinance.api.entity.User;
import uz.familyfinance.api.enums.ScopeType;
import uz.familyfinance.api.enums.TransactionType;
import uz.familyfinance.api.exception.BadRequestException;
import uz.familyfinance.api.repository.AccountRepository;
import uz.familyfinance.api.repository.PointBalanceRepository;
import uz.familyfinance.api.repository.PointConversionRepository;
import uz.familyfinance.api.security.CustomUserDetails;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentCaptor.forClass;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Ball → pul konversiyasi: hisob guard'i va double-entry (F1).
 *
 * <p><b>Nima uchun bu test bor —</b> ikki alohida nuqson bitta metodda edi:</p>
 * <ol>
 *   <li><b>IDOR:</b> {@code targetAccountId} umuman tekshirilmasdi — begona oilaning
 *       hisob balansini oshirish mumkin edi;</li>
 *   <li><b>Buxgalteriya nosozligi:</b> {@code accountRepository.addToBalance()}
 *       to'g'ridan-to'g'ri chaqirilardi va {@code Transaction} yozuvi YARATILMASDI —
 *       natijada hisob balansi tranzaksiyalar yig'indisiga teng bo'lmay qolardi
 *       ("balansim qayerdan oshdi?" — tarixda hech narsa yo'q).</li>
 * </ol>
 *
 * <p>Endi: {@code AccountService.assertCanModify} + xonadon/valyuta mosligi, va balans
 * {@code TransactionService.createSystem} orqali (u INCOME uchun transit hisobni o'zi
 * topib double-entry quradi).</p>
 *
 * <p>Toza mock'lar (Spring/DB kerak emas) → gating surefire'da ishlaydi.</p>
 */
@DisplayName("Ball konversiyasi — hisob guard'i va double-entry (F1)")
class PointConversionGuardTest {

    private static final long PARTICIPANT_ID = 5L;
    private static final long HOUSEHOLD_SCOPE_ID = 2L;
    private static final long OTHER_SCOPE_ID = 99L;
    private static final long ACCOUNT_ID = 11L;
    private static final int POINTS = 10;

    private AccountRepository accountRepository;
    private AccountService accountService;
    private TransactionService financialTransactionService;
    private PointConversionRepository conversionRepository;
    private PointConversionService service;

    private Account account;
    private Scope householdScope;

    @BeforeEach
    void setUp() {
        accountRepository = mock(AccountRepository.class);
        accountService = mock(AccountService.class);
        financialTransactionService = mock(TransactionService.class);
        conversionRepository = mock(PointConversionRepository.class);
        PointBalanceRepository balanceRepository = mock(PointBalanceRepository.class);
        PointParticipantService participantService = mock(PointParticipantService.class);
        PointTransactionService pointTransactionService = mock(PointTransactionService.class);
        PointConfigService configService = mock(PointConfigService.class);

        service = new PointConversionService(
                conversionRepository,
                balanceRepository,
                accountRepository,
                participantService,
                pointTransactionService,
                configService,
                accountService,
                financialTransactionService);

        householdScope = mock(Scope.class);
        when(householdScope.getId()).thenReturn(HOUSEHOLD_SCOPE_ID);
        when(householdScope.getType()).thenReturn(ScopeType.HOUSEHOLD);

        PointParticipant participant = mock(PointParticipant.class);
        when(participant.getId()).thenReturn(PARTICIPANT_ID);
        when(participant.getScope()).thenReturn(householdScope);
        when(participant.getDisplayName()).thenReturn("Test ishtirokchi");
        when(participantService.findById(PARTICIPANT_ID)).thenReturn(participant);

        PointBalance balance = mock(PointBalance.class);
        when(balance.getCurrentBalance()).thenReturn(1000);
        when(balance.getInflationMultiplier()).thenReturn(BigDecimal.ONE);
        when(balanceRepository.findByParticipantId(PARTICIPANT_ID)).thenReturn(Optional.of(balance));

        PointConfig config = mock(PointConfig.class);
        when(config.getConversionRate()).thenReturn(BigDecimal.valueOf(100));
        when(config.getCurrency()).thenReturn("UZS");
        when(configService.getConfigEntity()).thenReturn(config);

        User approver = mock(User.class);
        CustomUserDetails details = mock(CustomUserDetails.class);
        when(details.getUser()).thenReturn(approver);
        when(configService.getCurrentUserDetails()).thenReturn(details);

        account = mock(Account.class);
        when(account.getId()).thenReturn(ACCOUNT_ID);
        when(account.getHomeScope()).thenReturn(householdScope);
        when(account.getCurrency()).thenReturn("UZS");
        when(accountRepository.findById(ACCOUNT_ID)).thenReturn(Optional.of(account));

        when(conversionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    private PointConversionRequest request(Long targetAccountId) {
        PointConversionRequest r = new PointConversionRequest();
        r.setParticipantId(PARTICIPANT_ID);
        r.setPoints(POINTS);
        r.setTargetAccountId(targetAccountId);
        return r;
    }

    @Nested
    @DisplayName("Hisob guard'i (IDOR)")
    class AccountGuard {

        @Test
        @DisplayName("Yozish huquqi yo'q hisob -> 403, balans o'zgarmaydi")
        void foreignAccountDenied() {
            doThrow(new AccessDeniedException("Bu hisobga kirish huquqingiz yo'q"))
                    .when(accountService).assertCanModify(account);

            assertThatThrownBy(() -> service.convert(request(ACCOUNT_ID)))
                    .isInstanceOf(AccessDeniedException.class);

            verify(financialTransactionService, never()).createSystem(any());
            verify(accountRepository, never()).addToBalance(anyLong(), any());
        }

        @Test
        @DisplayName("Boshqa xonadon hisobi -> 400 (ball qaysi xonadonda bo'lsa, pul ham o'sha yerda)")
        void otherHouseholdDenied() {
            Scope otherScope = mock(Scope.class);
            when(otherScope.getId()).thenReturn(OTHER_SCOPE_ID);
            when(account.getHomeScope()).thenReturn(otherScope);

            assertThatThrownBy(() -> service.convert(request(ACCOUNT_ID)))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("xonadoningiz");

            verify(financialTransactionService, never()).createSystem(any());
        }

        @Test
        @DisplayName("Valyuta mos emas -> 400 (summa jimgina boshqa pulga aylanmasin)")
        void currencyMismatchDenied() {
            when(account.getCurrency()).thenReturn("USD");

            assertThatThrownBy(() -> service.convert(request(ACCOUNT_ID)))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("valyuta");

            verify(financialTransactionService, never()).createSystem(any());
        }
    }

    @Nested
    @DisplayName("Double-entry (balans + tarix birga)")
    class DoubleEntry {

        @Test
        @DisplayName("Konversiya INCOME tranzaksiyasi orqali yoziladi, addToBalance chaqirilmaydi")
        void createsIncomeTransactionInsteadOfRawBalanceUpdate() {
            service.convert(request(ACCOUNT_ID));

            var captor = forClass(TransactionRequest.class);
            verify(financialTransactionService).createSystem(captor.capture());
            TransactionRequest tx = captor.getValue();

            assertThat(tx.getType()).isEqualTo(TransactionType.INCOME);
            assertThat(tx.getAccountId()).isEqualTo(ACCOUNT_ID);
            // 10 ball * 1.0 inflyatsiya * 100 stavka = 1000.00
            assertThat(tx.getAmount()).isEqualByComparingTo(new BigDecimal("1000.00"));
            assertThat(tx.getDescription()).contains(String.valueOf(POINTS));

            // Eski yo'l (tarixsiz balans o'zgarishi) endi ishlatilmaydi
            verify(accountRepository, never()).addToBalance(anyLong(), any());
        }

        @Test
        @DisplayName("targetAccountId null bo'lsa hisob guard'i ham, tranzaksiya ham yo'q")
        void noAccountMeansNoFinancialTransaction() {
            service.convert(request(null));

            verify(accountService, never()).assertCanModify(any());
            verify(financialTransactionService, never()).createSystem(any());
            verify(conversionRepository).save(any());
        }
    }
}
