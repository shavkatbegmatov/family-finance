package uz.familyfinance.api.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * {@link CardEncryptionService} — AES shifrlash round-trip uchun toza-mantiq testlari.
 *
 * Konstruktor kalitni oladi → Spring konteksti/DB kerak emas (unit test, tez, gating
 * surefire'da). Karta raqamlari shifrlangan saqlanadi; bu test decrypt(encrypt(x)) == x
 * invariantini va shifrmatn ochiq matndan farq qilishini qulflaydi (C7 kalit rotatsiyasi
 * migratsiyasidan oldin xavfsizlik to'ri).
 */
@DisplayName("CardEncryptionService (AES round-trip)")
class CardEncryptionServiceTest {

    // 32 belgi = AES-256 kalit (application-dev.yml dagi dev qiymat bilan bir xil tarkib)
    private final CardEncryptionService service =
            new CardEncryptionService("dev-only-card-key-32-characters!");

    @ParameterizedTest(name = "round-trip: \"{0}\"")
    @ValueSource(strings = {
            "8600123456789012",        // UZCARD PAN
            "5614680112345678",        // HUMO PAN
            "4111111111111111",        // Visa test PAN
            "1",                       // qisqa
            "Familiya Ism Sharif"      // matn (egasining ismi)
    })
    @DisplayName("decrypt(encrypt(x)) == x")
    void roundTripReturnsOriginal(String plain) {
        String encrypted = service.encrypt(plain);
        assertThat(service.decrypt(encrypted)).isEqualTo(plain);
    }

    @Test
    @DisplayName("shifrmatn ochiq matndan farq qiladi (haqiqatan shifrlangan)")
    void cipherDiffersFromPlaintext() {
        String plain = "8600123456789012";
        String encrypted = service.encrypt(plain);
        assertThat(encrypted).isNotEqualTo(plain);
        assertThat(encrypted).isNotBlank();
    }

    @Test
    @DisplayName("null kirish RuntimeException tashlaydi (jimgina yutilmaydi)")
    void nullInputThrows() {
        assertThatThrownBy(() -> service.encrypt(null)).isInstanceOf(RuntimeException.class);
        assertThatThrownBy(() -> service.decrypt(null)).isInstanceOf(RuntimeException.class);
    }
}
