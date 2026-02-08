package uz.familyfinance.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChartDataResponse {
    private List<MonthlyData> monthlyTrend;
    private List<CategoryData> expenseByCategory;
    private List<CategoryData> incomeByCategory;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class MonthlyData {
        private String month;
        private BigDecimal income;
        private BigDecimal expense;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class CategoryData {
        private String name;
        private BigDecimal amount;
        private String color;
        private Double percentage;
    }
}
