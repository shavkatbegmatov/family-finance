package uz.familyfinance.api.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;
import uz.familyfinance.api.entity.FamilyMember;
import uz.familyfinance.api.enums.ScopeRole;
import uz.familyfinance.api.exception.BadRequestException;
import uz.familyfinance.api.exception.ResourceNotFoundException;
import uz.familyfinance.api.repository.FamilyMemberRepository;
import uz.familyfinance.api.repository.FamilyUnitRepository;
import uz.familyfinance.api.repository.PointParticipantRepository;
import uz.familyfinance.api.repository.RoleRepository;
import uz.familyfinance.api.repository.UserRepository;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Oila a'zosiga login ochishda rol tanlovi — privilege escalation regressiya qulfi.
 *
 * <p><b>Nima uchun bu test bor:</b> avval {@code accountRole} qiymati to'g'ridan-to'g'ri
 * GLOBAL RBAC roliga aylanardi. UI "Administrator" tanlovini taklif qilgani uchun har qanday
 * foydalanuvchi o'z oilasiga a'zo qo'shib, unga global {@code ADMIN} rolini bera olardi.
 * Global {@code ADMIN} esa {@code CustomUserDetails.isAdmin()} orqali tenant chegarasini
 * bekor qiladi — begona oilalarning hisoblari, tranzaksiyalari va a'zolari ochilardi.
 * Ya'ni oddiy foydalanuvchi o'ziga platforma-keng kirish yasay olardi.</p>
 *
 * <p>Tuzatish: "ADMIN" tanlovi endi FAQAT {@link ScopeRole#ADMIN} (o'z xonadoni ichida
 * boshqaruv) beradi; global RBAC roli hech qachon {@code ADMIN} bo'lmaydi. Oq ro'yxatdan
 * tashqari har qanday kod (masalan {@code SUPER_ADMIN}) — 400.</p>
 *
 * <p>Toza mock'lar (Spring/DB kerak emas) → gating surefire'da ishlaydi.</p>
 */
@DisplayName("UserService — oila a'zosi rol tanlovi (privilege escalation guard)")
class UserRoleChoiceTest {

    private static final String USERNAME = "testuser";

    private UserRepository userRepository;
    private RoleRepository roleRepository;
    private ScopeMembershipService scopeMembershipService;
    private UserService service;
    private FamilyMember member;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        roleRepository = mock(RoleRepository.class);
        scopeMembershipService = mock(ScopeMembershipService.class);

        service = new UserService(
                userRepository,
                roleRepository,
                mock(FamilyMemberRepository.class),
                mock(FamilyUnitRepository.class),
                mock(PointParticipantRepository.class),
                mock(ScopeContextService.class),
                scopeMembershipService,
                mock(PasswordEncoder.class),
                mock(AuditLogService.class),
                mock(SessionService.class),
                mock(PwnedPasswordService.class));

        member = mock(FamilyMember.class);
        when(member.getFullName()).thenReturn("Test User");

        when(userRepository.existsByUsername(anyString())).thenReturn(false);
        // Rol topilmaydi -> ResourceNotFoundException. Bizni QAYSI kod so'ralgani qiziqtiradi,
        // shuning uchun oqim shu yerda to'xtaydi va verify() bilan tasdiqlanadi.
        when(roleRepository.findByCode(anyString())).thenReturn(Optional.empty());
    }

    /** Test yo'li rol qidiruvigacha boradi va o'sha yerda to'xtaydi. */
    private void createWithRole(String roleChoice) {
        service.createUserForFamilyMember(member, roleChoice, null, USERNAME);
    }

    @Nested
    @DisplayName("Oq ro'yxatdan tashqari rollar rad etiladi")
    class Rejected {

        @Test
        @DisplayName("SUPER_ADMIN so'ralsa 400 — bu yo'l bilan hech qachon berilmaydi")
        void superAdminRejected() {
            assertThatThrownBy(() -> createWithRole("SUPER_ADMIN"))
                    .isInstanceOf(BadRequestException.class);
            verify(roleRepository, never()).findByCode(anyString());
        }

        @Test
        @DisplayName("Notanish rol kodi 400 beradi")
        void unknownRoleRejected() {
            assertThatThrownBy(() -> createWithRole("OWNER"))
                    .isInstanceOf(BadRequestException.class);
            verify(roleRepository, never()).findByCode(anyString());
        }
    }

    @Nested
    @DisplayName("Global RBAC roli hech qachon ADMIN bo'lmaydi")
    class GlobalRoleNeverAdmin {

        @Test
        @DisplayName("\"ADMIN\" tanlansa ham global rol MEMBER so'raladi")
        void adminChoiceResolvesToGlobalMember() {
            assertThatThrownBy(() -> createWithRole("ADMIN"))
                    .isInstanceOf(ResourceNotFoundException.class); // mock: rol topilmadi

            verify(roleRepository).findByCode("MEMBER");
            verify(roleRepository, never()).findByCode("ADMIN");
        }

        @Test
        @DisplayName("Kichik harfli \"admin\" ham xuddi shunday normallashadi")
        void lowercaseAdminNormalized() {
            assertThatThrownBy(() -> createWithRole("admin"))
                    .isInstanceOf(ResourceNotFoundException.class);

            verify(roleRepository).findByCode("MEMBER");
            verify(roleRepository, never()).findByCode("ADMIN");
        }

        @Test
        @DisplayName("null rol default MEMBER'ga tushadi")
        void nullRoleDefaultsToMember() {
            assertThatThrownBy(() -> createWithRole(null))
                    .isInstanceOf(ResourceNotFoundException.class);

            verify(roleRepository).findByCode("MEMBER");
        }

        @Test
        @DisplayName("bo'sh satr ham default MEMBER'ga tushadi")
        void blankRoleDefaultsToMember() {
            assertThatThrownBy(() -> createWithRole("   "))
                    .isInstanceOf(ResourceNotFoundException.class);

            verify(roleRepository).findByCode("MEMBER");
        }
    }

    @Nested
    @DisplayName("Xonadon-admin funksionalligi saqlanadi")
    class HouseholdAdminPreserved {

        @Test
        @DisplayName("Rol tanlovi scope roliga alohida aylanadi (global roldan mustaqil)")
        void adminChoiceStillReachesScopeRole() {
            // Oqim rol qidiruvida to'xtagani uchun attachToHousehold'gacha yetmaydi —
            // bu test tanlov global rolga TENGLASHTIRILMASLIGINI hujjatlashtiradi.
            // Scope roli haqiqatda ADMIN bo'lishini uchidan-uchiga tekshirish
            // integration test ishi (S1 bilan birga qo'shiladi).
            assertThatThrownBy(() -> createWithRole("ADMIN"))
                    .isInstanceOf(ResourceNotFoundException.class);

            verify(scopeMembershipService, never()).attachToHousehold(any(), any(), any());
            verify(roleRepository).findByCode("MEMBER");
        }
    }
}
