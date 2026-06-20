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
public class DashboardStatsResponse {
    /** Asosiy (eng katta) valyutadagi balans — raqamli ko'rsatkichlar (mobil hero) uchun. */
    private BigDecimal totalBalance;
    /** D7: balans valyutalar bo'yicha ajratilgan (asosiy + qolganlar, summa kamayuvchi). */
    private List<CurrencyBalanceResponse> balancesByCurrency;
    private BigDecimal totalIncome;
    private BigDecimal totalExpense;
    private BigDecimal totalSavings;
    private BigDecimal totalDebtsGiven;
    private BigDecimal totalDebtsTaken;
    private Integer activeGoals;
    private Integer activeBudgets;
    private List<BudgetProgress> budgetProgress;
    private List<SavingsProgress> savingsProgress;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class BudgetProgress {
        private String categoryName;
        private BigDecimal budgetAmount;
        private BigDecimal spentAmount;
        private Double percentage;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class SavingsProgress {
        private String goalName;
        private BigDecimal targetAmount;
        private BigDecimal currentAmount;
        private Double percentage;
    }
}
