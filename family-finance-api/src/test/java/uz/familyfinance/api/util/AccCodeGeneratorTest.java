package uz.familyfinance.api.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * {@link AccCodeGenerator} — 20 xonali hisob raqami generatori uchun toza-mantiq testlari.
 *
 * Spring konteksti, DB yoki tarmoqqa bog'liq emas — surefire'da lokal va CI'da bir xil ishlaydi.
 * Check-digit qiymatlari kod amalda hisoblayotgan algoritmga (vazn {7,1,3,7,1,3,7,1}, sum % 10)
 * qarab pinlangan; javadoc'dagi eskirgan misol (checkDigit=7) bilan ataylab solishtirilmagan.
 */
@DisplayName("AccCodeGenerator")
class AccCodeGeneratorTest {

    @Nested
    @DisplayName("calculateCheckDigit")
    class CalculateCheckDigit {

        @ParameterizedTest(name = "checkDigit(\"{0}\") = {1}")
        @CsvSource({
                "00000000, 0",
                "10000000, 7",   // 1*7 = 7
                "11111111, 0",   // 7+1+3+7+1+3+7+1 = 30 -> 30 % 10 = 0
                "20202000, 2"    // 2*7 + 2*3 + 2*1 = 14+6+2 = 22 -> 22 % 10 = 2
        })
        @DisplayName("vazn koeffitsiyentlari bilan to'g'ri qoldiq qaytaradi")
        void returnsWeightedRemainder(String first8, int expected) {
            assertThat(AccCodeGenerator.calculateCheckDigit(first8)).isEqualTo(expected);
        }

        @Test
        @DisplayName("har doim bitta xonali (0..9) qiymat qaytaradi")
        void alwaysSingleDigit() {
            assertThat(AccCodeGenerator.calculateCheckDigit("99999999")).isBetween(0, 9);
        }

        @ParameterizedTest
        @ValueSource(strings = {"", "123", "123456789"})
        @DisplayName("8 xonadan farqli uzunlikda xatolik tashlaydi")
        void throwsOnWrongLength(String bad) {
            assertThatThrownBy(() -> AccCodeGenerator.calculateCheckDigit(bad))
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }

    @Nested
    @DisplayName("generate")
    class Generate {

        @Test
        @DisplayName("20 xonali, tarkibiy qismlari to'ldirilgan kod hosil qiladi")
        void buildsTwentyDigitCode() {
            String code = AccCodeGenerator.generate("20202", "000", 1234L, 1, 1);

            assertThat(code).hasSize(20).containsOnlyDigits();
            assertThat(code).startsWith("20202000");          // balanceCode + currencyCode
            assertThat(code).endsWith("001234" + "01" + "001"); // family + member + serial
        }

        @Test
        @DisplayName("hosil qilingan kod o'z-o'zini validatsiyadan o'tkazadi (round-trip)")
        void generatedCodeIsValid() {
            String code = AccCodeGenerator.generate("20202", "000", 1234L, 1, 1);
            assertThat(AccCodeGenerator.validate(code)).isTrue();
        }

        @Test
        @DisplayName("chegaradagi qiymatlarni qabul qiladi (familyId=999999, member=99, serial=999)")
        void acceptsBoundaryValues() {
            String code = AccCodeGenerator.generate("10101", "840", 999999L, 99, 999);
            assertThat(code).hasSize(20);
            assertThat(AccCodeGenerator.validate(code)).isTrue();
        }

        @ParameterizedTest(name = "noto'g'ri kirish #{index}")
        @CsvSource({
                "2020,  000, 1, 1, 1",    // balanceCode 4 xona
                "20202, 00,  1, 1, 1",    // currencyCode 2 xona
                "20202, 000, 1000000, 1, 1", // familyId > 999999
                "20202, 000, 1, 100, 1",  // memberId > 99
                "20202, 000, 1, 1, 0",    // serial < 1
                "20202, 000, 1, 1, 1000"  // serial > 999
        })
        @DisplayName("noto'g'ri kirishda IllegalArgumentException")
        void throwsOnInvalidInput(String balance, String currency, long familyId, int memberId, int serial) {
            assertThatThrownBy(() -> AccCodeGenerator.generate(balance, currency, familyId, memberId, serial))
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }

    @Nested
    @DisplayName("parse")
    class Parse {

        @Test
        @DisplayName("kodni tarkibiy qismlarga to'g'ri ajratadi")
        void splitsIntoParts() {
            String code = AccCodeGenerator.generate("20202", "000", 1234L, 1, 7);
            AccCodeGenerator.AccCodeParts parts = AccCodeGenerator.parse(code);

            assertThat(parts.getBalanceCode()).isEqualTo("20202");
            assertThat(parts.getCurrencyCode()).isEqualTo("000");
            assertThat(parts.getFamilyId()).isEqualTo("001234");
            assertThat(parts.getMemberId()).isEqualTo("01");
            assertThat(parts.getSerialNumber()).isEqualTo("007");
            assertThat(parts.getCheckDigit()).isBetween(0, 9);
        }

        @ParameterizedTest
        @ValueSource(strings = {"123", "2020200020012340100X"})
        @DisplayName("noto'g'ri formatda xatolik tashlaydi")
        void throwsOnBadFormat(String bad) {
            assertThatThrownBy(() -> AccCodeGenerator.parse(bad))
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }

    @Nested
    @DisplayName("formatForDisplay")
    class FormatForDisplay {

        @Test
        @DisplayName("bo'limlarni bo'sh joy bilan ajratadi")
        void insertsSpaces() {
            String code = AccCodeGenerator.generate("20202", "000", 1234L, 1, 1);
            String display = AccCodeGenerator.formatForDisplay(code);

            // "CCCCC VVV K XXXXXX YY NNN"
            assertThat(display).matches("\\d{5} \\d{3} \\d \\d{6} \\d{2} \\d{3}");
            assertThat(display.replace(" ", "")).isEqualTo(code);
        }
    }

    @Nested
    @DisplayName("validate")
    class Validate {

        @Test
        @DisplayName("null va noto'g'ri uzunlikni rad etadi")
        void rejectsNullAndWrongLength() {
            assertThat(AccCodeGenerator.validate(null)).isFalse();
            assertThat(AccCodeGenerator.validate("123")).isFalse();
            assertThat(AccCodeGenerator.validate("123456789012345678901")).isFalse(); // 21 xona
        }

        @Test
        @DisplayName("raqam bo'lmagan belgilarni rad etadi")
        void rejectsNonNumeric() {
            assertThat(AccCodeGenerator.validate("2020200020012340100X")).isFalse();
        }

        @Test
        @DisplayName("buzilgan nazorat kalitini rad etadi")
        void rejectsTamperedCheckDigit() {
            String code = AccCodeGenerator.generate("20202", "000", 1234L, 1, 1);
            int realCheck = Character.getNumericValue(code.charAt(8));
            int wrongCheck = (realCheck + 1) % 10;
            String tampered = code.substring(0, 8) + wrongCheck + code.substring(9);

            assertThat(AccCodeGenerator.validate(tampered)).isFalse();
        }
    }
}
