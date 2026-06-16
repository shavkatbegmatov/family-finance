package uz.familyfinance.api.service.export;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import uz.familyfinance.api.annotation.ExportColumn.ColumnType;
import uz.familyfinance.api.enums.AccountType;
import uz.familyfinance.api.enums.DebtStatus;
import uz.familyfinance.api.enums.TransactionType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * {@link ExportFormatter} — eksport ustun qiymatlarini formatlash testlari.
 *
 * Bog'liqliksiz toza komponent. Valyuta formati JVM lokaliga bog'liq ({@code %,.2f} ajratuvchisi),
 * shuning uchun valyuta assertion'lari lokaldan mustaqil: raqamlar ketma-ketligi va "so'm"
 * qo'shimchasi tekshiriladi (aniq ajratuvchi emas) — CI (en_US) va lokal mashinada bir xil o'tadi.
 */
@DisplayName("ExportFormatter")
class ExportFormatterTest {

    private final ExportFormatter formatter = new ExportFormatter();

    private static ExportColumnConfig config(ColumnType type) {
        return ExportColumnConfig.builder().type(type).sensitive(false).build();
    }

    @Test
    @DisplayName("null qiymat -> '-'")
    void nullBecomesDash() {
        assertThat(formatter.format(null, config(ColumnType.STRING))).isEqualTo("-");
    }

    @Test
    @DisplayName("CURRENCY: raqamlar saqlanadi va 'so'm' bilan tugaydi (lokaldan mustaqil)")
    void formatsCurrencyLocaleIndependent() {
        String result = (String) formatter.format(new BigDecimal("1234.50"), config(ColumnType.CURRENCY));

        assertThat(result).endsWith("so'm");
        // Ajratuvchini e'tiborsiz qoldirib, faqat raqam ketma-ketligini tekshiramiz
        assertThat(result.replaceAll("[^0-9]", "")).isEqualTo("123450");
    }

    @Test
    @DisplayName("DATE: dd.MM.yyyy")
    void formatsDate() {
        assertThat(formatter.format(LocalDate.of(2026, 6, 16), config(ColumnType.DATE)))
                .isEqualTo("16.06.2026");
    }

    @Test
    @DisplayName("DATETIME: dd.MM.yyyy HH:mm:ss")
    void formatsDateTime() {
        assertThat(formatter.format(LocalDateTime.of(2026, 6, 16, 14, 5, 9), config(ColumnType.DATETIME)))
                .isEqualTo("16.06.2026 14:05:09");
    }

    @Test
    @DisplayName("BOOLEAN: Ha / Yo'q")
    void formatsBoolean() {
        assertThat(formatter.format(true, config(ColumnType.BOOLEAN))).isEqualTo("Ha");
        assertThat(formatter.format(false, config(ColumnType.BOOLEAN))).isEqualTo("Yo'q");
    }

    @Test
    @DisplayName("ENUM: domen enumlari o'zbekcha yorliqqa o'giriladi")
    void formatsKnownEnums() {
        assertThat(formatter.format(DebtStatus.OVERDUE, config(ColumnType.ENUM))).isEqualTo("Muddati o'tgan");
        assertThat(formatter.format(TransactionType.REVERSAL, config(ColumnType.ENUM))).isEqualTo("Storno");
        assertThat(formatter.format(AccountType.BANK_CARD, config(ColumnType.ENUM))).isEqualTo("Bank kartasi");
    }

    @Test
    @DisplayName("NUMBER: toString()")
    void formatsNumber() {
        assertThat(formatter.format(42, config(ColumnType.NUMBER))).isEqualTo("42");
    }

    @Test
    @DisplayName("sensitive ustun: oxirgi 4 belgidan boshqasi yulduzcha bilan yashiriladi")
    void masksSensitiveData() {
        ExportColumnConfig sensitive = ExportColumnConfig.builder()
                .type(ColumnType.STRING).sensitive(true).build();

        assertThat(formatter.format("12345678", sensitive)).isEqualTo("****5678");
        assertThat(formatter.format("abc", sensitive)).isEqualTo("****"); // <= 4 belgi -> to'liq yashirin
    }
}
