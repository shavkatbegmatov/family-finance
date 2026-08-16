package uz.familyfinance.api.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import uz.familyfinance.api.entity.Account;
import uz.familyfinance.api.entity.Scope;
import uz.familyfinance.api.entity.User;
import uz.familyfinance.api.repository.AccountAccessRepository;
import uz.familyfinance.api.repository.AccountRepository;
import uz.familyfinance.api.repository.CardRepository;
import uz.familyfinance.api.repository.FamilyMemberRepository;
import uz.familyfinance.api.repository.TransactionRepository;
import uz.familyfinance.api.security.CustomUserDetails;

import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * RBAC {@code ADMIN} roli endi tenant chegarasini kesib o'tmaydi — S1 regressiya qulfi.
 *
 * <p><b>Nima uchun bu test bor:</b> {@code CustomUserDetails.isAdmin()} —
 * {@code roleCodes.contains("ADMIN")}, ya'ni oddiy RBAC roli. U oila ichida
 * {@code accountRole} orqali tarqatilardi, lekin kod uni "platforma admini" ma'nosida
 * 9 joyda avtorizatsiya bypass'i sifatida ishlatardi: {@code AccountService} ×4
 * (ko'rish / tahrirlash / egalik / tranzaksiya kiritish), {@code AccountAccessService} ×1
 * (hisobga kirish huquqlarini TARQATISH), {@code FamilyMemberService} ×4. Natijada bitta
 * oilaning admini BARCHA oilalarning moliyaviy va genealogik ma'lumotlarini ochа olardi.</p>
 *
 * <p>Endi: platforma nazorati faqat {@code isSuperAdmin()} (read-only), qolgan huquqlar
 * scope roli yoki aniq {@code AccountAccess} grant orqali.</p>
 *
 * <p>Toza mock'lar (Spring/DB kerak emas) → gating surefire'da ishlaydi.</p>
 */
@DisplayName("ADMIN roli tenant chegarasini kesmaydi (S1)")
class AdminRoleTenantGuardTest {

    private static final long ACCOUNT_ID = 42L;
    private static final long SCOPE_ID = 7L;
    private static final long USER_ID = 3L;

    private AccountRepository accountRepository;
    private AccountAccessRepository accountAccessRepository;
    private ScopeContextService scopeContext;
    private AccountService service;
    private Account account;

    @BeforeEach
    void setUp() {
        accountRepository = mock(AccountRepository.class);
        accountAccessRepository = mock(AccountAccessRepository.class);
        scopeContext = mock(ScopeContextService.class);

        service = new AccountService(
                accountRepository,
                accountAccessRepository,
                mock(AccountAccessService.class),
                mock(FamilyMemberRepository.class),
                mock(TransactionRepository.class),
                mock(CardRepository.class),
                mock(CardEncryptionService.class),
                scopeContext);

        Scope homeScope = mock(Scope.class);
        when(homeScope.getId()).thenReturn(SCOPE_ID);
        account = mock(Account.class);
        when(account.getId()).thenReturn(ACCOUNT_ID);
        when(account.getHomeScope()).thenReturn(homeScope);

        // Joriy foydalanuvchi: RBAC ADMIN roliga EGA, lekin super admin EMAS —
        // aynan eski bypass'dan foydalanadigan profil.
        User user = mock(User.class);
        when(user.getId()).thenReturn(USER_ID);
        when(user.getRoles()).thenReturn(Set.of());
        CustomUserDetails details = mock(CustomUserDetails.class);
        when(details.getId()).thenReturn(USER_ID);
        when(details.getUser()).thenReturn(user);
        when(details.isAdmin()).thenReturn(true); // <-- eski bypass manbai
        when(scopeContext.getCurrentUserDetails()).thenReturn(details);

        when(scopeContext.isSuperAdmin()).thenReturn(false);
        when(scopeContext.getVisibleScopeIds()).thenReturn(Set.of());
        when(scopeContext.canWriteToScope(anyLong())).thenReturn(false);
        when(scopeContext.canManageScope(anyLong())).thenReturn(false);
        when(accountRepository.canUserAccessAccount(anyLong(), anyLong(), anyBoolean(), any()))
                .thenReturn(false);
        when(accountAccessRepository.findRoleByAccountIdAndUserId(anyLong(), anyLong()))
                .thenReturn(Optional.empty());
    }

    @Nested
    @DisplayName("ADMIN roli endi bypass bermaydi")
    class AdminNoLongerBypasses {

        @Test
        @DisplayName("Begona hisobni KO'RISH -> 403 (avval isAdmin() o'tkazardi)")
        void readDeniedForAdminRole() {
            assertThatThrownBy(() -> service.assertCanAccess(account))
                    .isInstanceOf(AccessDeniedException.class);
        }

        @Test
        @DisplayName("Begona hisobga YOZISH -> 403 (avval isAdmin() o'tkazardi)")
        void writeDeniedForAdminRole() {
            assertThatThrownBy(() -> service.assertCanModify(account))
                    .isInstanceOf(AccessDeniedException.class);
        }
    }

    @Nested
    @DisplayName("Super admin nazorati saqlanadi (read-only)")
    class SuperAdminStillReads {

        @Test
        @DisplayName("Super admin istalgan hisobni ko'radi")
        void superAdminCanRead() {
            when(scopeContext.isSuperAdmin()).thenReturn(true);
            assertThatCode(() -> service.assertCanAccess(account)).doesNotThrowAnyException();
        }

        @Test
        @DisplayName("Super admin YOZA olmaydi — read-only profil (ADR)")
        void superAdminCannotWrite() {
            when(scopeContext.isSuperAdmin()).thenReturn(true);
            // canWriteToScope super admin uchun ataylab false qaytaradi
            assertThatThrownBy(() -> service.assertCanModify(account))
                    .isInstanceOf(AccessDeniedException.class);
        }
    }

    @Nested
    @DisplayName("Xonadon egasi grant'siz ham o'z hisobiga yoza oladi")
    class ScopeRoleIsEnough {

        /**
         * Prod'da aniqlangan real holat: 10 faol hisobdan 2 tasida egasi scope'da OWNER,
         * lekin AccountAccess yozuvi YO'Q. isAdmin() bypass'i buni yashirib turardi —
         * uni shunchaki o'chirish xonadon egasini o'z kartasidan ayirardi.
         */
        @Test
        @DisplayName("Scope'da yozish roli bor, AccountAccess grant yo'q -> yozish MUMKIN")
        void scopeWriteRoleWithoutGrantAllowed() {
            when(scopeContext.canWriteToScope(SCOPE_ID)).thenReturn(true);
            assertThatCode(() -> service.assertCanModify(account)).doesNotThrowAnyException();
        }

        @Test
        @DisplayName("Scope roli ham, grant ham yo'q -> 403")
        void neitherScopeRoleNorGrantDenied() {
            assertThatThrownBy(() -> service.assertCanModify(account))
                    .isInstanceOf(AccessDeniedException.class);
        }

        @Test
        @DisplayName("Boshqa scope'da yozish roli bu hisobga yordam bermaydi")
        void writeRoleInOtherScopeDoesNotLeak() {
            when(scopeContext.canWriteToScope(SCOPE_ID + 1)).thenReturn(true);
            assertThatThrownBy(() -> service.assertCanModify(account))
                    .isInstanceOf(AccessDeniedException.class);
        }
    }
}
