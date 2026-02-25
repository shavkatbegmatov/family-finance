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
public class MemberFinancialSummaryResponse {

    // Profil ma'lumotlari
    private FamilyMemberResponse profile;

    // Joriy oylik KPI
    private BigDecimal monthlyIncome;
    private BigDecimal monthlyExpense;
    private BigDecimal netBalance;
    private BigDecimal totalAccountBalance;

    // A'zoning hisoblar ro'yxati
    private List<AccountSummary> accounts;

    // Kategoriya bo'yicha tahlil (joriy oy)
    private List<CategoryBreakdown> expenseByCategory;
    private List<CategoryBreakdown> incomeByCategory;

    // 6 oylik trend
    private List<MonthlyTrend> monthlyTrend;

    // Oxirgi 5 tranzaksiya
    private List<RecentTransaction> recentTransactions;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AccountSummary {
        private Long id;
        private String name;
        private String type;
        private BigDecimal balance;
        private String currency;
        private String status;
        private String scope;
        private String accCode;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CategoryBreakdown {
        private Long categoryId;
        private String categoryName;
        private String categoryColor;
        private BigDecimal amount;
        private Double percentage;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MonthlyTrend {
        private String month;
        private int year;
        private BigDecimal income;
        private BigDecimal expense;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecentTransaction {
        private Long id;
        private String type;
        private BigDecimal amount;
        private String categoryName;
        private String description;
        private String transactionDate;
        private String status;
    }
}
