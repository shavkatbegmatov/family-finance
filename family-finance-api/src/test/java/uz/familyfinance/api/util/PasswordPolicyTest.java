package uz.familyfinance.api.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import uz.familyfinance.api.exception.BadRequestException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * {@link PasswordPolicy} — parol siyosatining yagona manbasi uchun toza-mantiq testlari.
 *
 * Spring konteksti, DB yoki tarmoqqa bog'liq emas — surefire'da lokal va CI'da bir xil ishlaydi.
 * Frontend hamkori (password.test.ts) bilan izchil: MIN_LENGTH=10, murakkablik = katta+kichik+raqam.
 */
@DisplayName("PasswordPolicy")
class PasswordPolicyTest {

    @Test
    @DisplayName("MIN_LENGTH = 10 (siyosatni qulflaydi; front PASSWORD_MIN_LENGTH bilan mos bo'lishi shart)")
    void minLengthIsTen() {
        assertThat(PasswordPolicy.MIN_LENGTH).isEqualTo(10);
    }

    @Nested
    @DisplayName("validateMinLength (admin-set parol)")
    class ValidateMinLength {

        @Test
        @DisplayName("null parolni rad etadi")
        void rejectsNull() {
            assertThatThrownBy(() -> PasswordPolicy.validateMinLength(null))
                    .isInstanceOf(BadRequestException.class);
        }

        @ParameterizedTest(name = "\"{0}\" (qisqa) rad etiladi")
        @ValueSource(strings = {"", "a", "Abc12", "Abcdefgh1"}) // 9 belgigacha
        @DisplayName("MIN_LENGTH dan qisqa parolni rad etadi")
        void rejectsShort(String password) {
            assertThatThrownBy(() -> PasswordPolicy.validateMinLength(password))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("10");
        }

        @ParameterizedTest(name = "\"{0}\" (>=10) o'tadi")
        @ValueSource(strings = {"abcdefghij", "1234567890", "Abcdefghi1"}) // murakkablik shart emas
        @DisplayName("MIN_LENGTH yoki undan uzun parolni qabul qiladi (murakkablik shart emas)")
        void acceptsLongEnough(String password) {
            assertThatCode(() -> PasswordPolicy.validateMinLength(password))
                    .doesNotThrowAnyException();
        }
    }

    @Nested
    @DisplayName("validateStrength (self-service parol)")
    class ValidateStrength {

        @Test
        @DisplayName("null parolni rad etadi")
        void rejectsNull() {
            assertThatThrownBy(() -> PasswordPolicy.validateStrength(null))
                    .isInstanceOf(BadRequestException.class);
        }

        @ParameterizedTest(name = "\"{0}\" rad etiladi")
        @ValueSource(strings = {
                "Abcdefgh1",   // 9 belgi — uzunlik yetarsiz
                "abcdefghij",  // katta harf yo'q
                "ABCDEFGHIJ",  // kichik harf yo'q
                "Abcdefghij"   // raqam yo'q
        })
        @DisplayName("uzunlik yoki murakkablik shartini buzgan parolni rad etadi")
        void rejectsWeak(String password) {
            assertThatThrownBy(() -> PasswordPolicy.validateStrength(password))
                    .isInstanceOf(BadRequestException.class);
        }

        @ParameterizedTest(name = "\"{0}\" qabul qilinadi")
        @ValueSource(strings = {"Abcdefghi1", "Parol12345", "XyzAbc1234"})
        @DisplayName("uzunlik + katta + kichik + raqam shartini qondirgan parolni qabul qiladi")
        void acceptsStrong(String password) {
            assertThatCode(() -> PasswordPolicy.validateStrength(password))
                    .doesNotThrowAnyException();
        }
    }
}
