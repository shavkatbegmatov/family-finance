package uz.familyfinance.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Kunlik xarajatlar jurnali uchun agregat xulosa. D7: barcha summalar valyuta
 * kesimida qaytadi — turli valyutalar hech qachon bitta songa yig'ilmaydi
 * (kim qo'shishni front primary-valyuta ko'rinishida hal qiladi).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExpenseSummaryResponse {

    /** Kun + valyuta kesimidagi xarajat jami (xarajatsiz kunlar chiqmaydi), sana bo'yicha kamayish tartibida. */
    private List<DailyTotal> dailyTotals;

    /** Kategoriya + valyuta kesimidagi xarajat jami; split ulushlari o'z kategoriyasida hisoblanadi. */
    private List<CategoryTotal> categoryTotals;

    /** Davr bo'yicha valyuta kesimidagi umumiy jami. */
    private List<CurrencyTotal> periodTotals;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyTotal {
        private LocalDate date;
        private String currency;
        private BigDecimal total;
        private long count;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CategoryTotal {
        /** null = kategoriyasiz xarajatlar guruhi. */
        private Long categoryId;
        private String categoryName;
        private String categoryIcon;
        private String categoryColor;
        private String currency;
        private BigDecimal total;
        private long count;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CurrencyTotal {
        private String currency;
        private BigDecimal total;
        private long count;
    }
}
