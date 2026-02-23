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
public class HouseholdDashboardResponse {
    private String groupName;
    private Long adminId;
    private boolean isAdmin;
    private List<HouseholdMemberSummary> members;
    private List<HouseholdAccountSummary> familyAccounts;
    private BigDecimal totalMonthlyIncome;
    private BigDecimal totalMonthlyExpense;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HouseholdMemberSummary {
        private Long id;
        private String fullName;
        private String role;
        private String gender;
        private String phone;
        private String avatar;
        private Long userId;
        private String username;
        private boolean isAdmin;
        private BigDecimal monthlyIncome;
        private BigDecimal monthlyExpense;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HouseholdAccountSummary {
        private Long id;
        private String name;
        private String accountType;
        private BigDecimal balance;
        private String currency;
        private String ownerName;
    }
}
