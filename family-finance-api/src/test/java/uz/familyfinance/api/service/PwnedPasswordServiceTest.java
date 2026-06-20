package uz.familyfinance.api.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.security.NoSuchAlgorithmException;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * {@link PwnedPasswordService} ning toza-mantiq qismlari (SHA-1 + HIBP javob parsing) testlari.
 *
 * HTTP qatlami (RestClient) va fail-open bu yerda sinalmaydi — k-anonymity HTTP integratsiyasi
 * prod smoke / manual bilan tasdiqlanadi. SHA-1 qiymatlari pinlangan (HIBP range API katta-harf hex).
 */
@DisplayName("PwnedPasswordService")
class PwnedPasswordServiceTest {

    @Nested
    @DisplayName("sha1Hex")
    class Sha1Hex {

        @Test
        @DisplayName("'password' -> ma'lum SHA-1 (katta-harf hex)")
        void knownHash() throws NoSuchAlgorithmException {
            assertThat(PwnedPasswordService.sha1Hex("password"))
                    .isEqualTo("5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8");
        }

        @Test
        @DisplayName("bo'sh satr -> ma'lum SHA-1")
        void emptyHash() throws NoSuchAlgorithmException {
            assertThat(PwnedPasswordService.sha1Hex(""))
                    .isEqualTo("DA39A3EE5E6B4B0D3255BFEF95601890AFD80709");
        }

        @Test
        @DisplayName("hash 40 belgi; prefix(5)+suffix(35) bo'linishi to'g'ri")
        void prefixSuffixSplit() throws NoSuchAlgorithmException {
            String sha1 = PwnedPasswordService.sha1Hex("password");
            assertThat(sha1).hasSize(40);
            assertThat(sha1.substring(0, 5)).isEqualTo("5BAA6");
            assertThat(sha1.substring(5)).isEqualTo("1E4C9B93F3F0682250B6CF8331B7EE68FD8");
        }
    }

    @Nested
    @DisplayName("containsSuffix")
    class ContainsSuffix {

        // "password" SHA-1 ning suffiks qismi
        private static final String PWNED_SUFFIX = "1E4C9B93F3F0682250B6CF8331B7EE68FD8";

        // HIBP range javobi namunasi ("SUFFIX:COUNT" qatorlar, CRLF bilan)
        private static final String BODY =
                "0018A45C4D1DEF81644B54AB7F969B88D65:1\r\n"
                        + "00D4F6E8FA6EECAD2A3AA415EEC418D38EC:2\r\n"
                        + PWNED_SUFFIX + ":9659365\r\n"
                        + "011053FD0102E94D6AE2F8B83D76FAF94F6:1";

        @Test
        @DisplayName("javobda mavjud suffiks (count>0) -> true")
        void foundPwned() {
            assertThat(PwnedPasswordService.containsSuffix(BODY, PWNED_SUFFIX)).isTrue();
        }

        @Test
        @DisplayName("katta-kichik harfga befarq")
        void caseInsensitive() {
            assertThat(PwnedPasswordService.containsSuffix(BODY, PWNED_SUFFIX.toLowerCase())).isTrue();
        }

        @Test
        @DisplayName("javobda yo'q suffiks -> false")
        void notFound() {
            assertThat(PwnedPasswordService.containsSuffix(BODY, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")).isFalse();
        }

        @Test
        @DisplayName("count=0 (padding qatori) -> buzilgan emas (false)")
        void paddingZeroCount() {
            String suffix = "ABCDEF0123456789ABCDEF0123456789ABC";
            assertThat(PwnedPasswordService.containsSuffix(suffix + ":0", suffix)).isFalse();
        }

        @Test
        @DisplayName("null yoki bo'sh javob -> false")
        void emptyBody() {
            assertThat(PwnedPasswordService.containsSuffix(null, PWNED_SUFFIX)).isFalse();
            assertThat(PwnedPasswordService.containsSuffix("", PWNED_SUFFIX)).isFalse();
        }
    }
}
