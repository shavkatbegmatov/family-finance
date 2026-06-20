package uz.familyfinance.api.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * D7: TRANSFER valyuta tengligi taqqoslash mantig'i ({@link TransactionService#isSameCurrency}).
 *
 * Valyuta kursi (FX) tizimi yo'qligi sababli turli valyutali o'tkazma summani
 * o'zgartirmasdan ko'chirib balansni buzadi (1000 UZS → 1000 USD), shuning uchun rad
 * etiladi. Bu test: (1) turli valyuta aniqlanishini, (2) taqqoslash case/probelga
 * bardoshli ekanini (currency drift legitimate bir-valyutali o'tkazmani sindirmasligi)
 * qulflaydi. Toza-mantiq (static) → Spring/DB kerak emas, gating surefire'da ishlaydi.
 */
@DisplayName("TransactionService.isSameCurrency (D7 TRANSFER valyuta guard)")
class TransactionCurrencyValidationTest {

    @ParameterizedTest(name = "[{index}] \"{0}\" vs \"{1}\" -> bir xil={2}")
    @CsvSource({
            "UZS, UZS, true",
            "USD, USD, true",
            "UZS, USD, false",
            "USD, UZS, false",
            "UZS, uzs, true",        // case drift -> bir xil valyuta
            "'UZS ', UZS, true",     // ortiqcha probel -> bir xil
            "' usd ', USD, true",    // case + probel
            "EUR, USD, false"
    })
    @DisplayName("valyuta tengligi case/probelga bardoshli aniqlanadi")
    void detectsCurrencyEquality(String a, String b, boolean expected) {
        assertThat(TransactionService.isSameCurrency(a, b)).isEqualTo(expected);
    }

    @Test
    @DisplayName("null valyuta xavfsiz ishlanadi (NPE yo'q)")
    void handlesNull() {
        assertThat(TransactionService.isSameCurrency(null, null)).isTrue();   // ikkalasi "" -> teng
        assertThat(TransactionService.isSameCurrency(null, "UZS")).isFalse();
        assertThat(TransactionService.isSameCurrency("UZS", null)).isFalse();
    }
}
