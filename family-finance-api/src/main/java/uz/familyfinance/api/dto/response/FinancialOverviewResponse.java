package uz.familyfinance.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * SUPER_ADMIN bitta oilaning (scope) READ-ONLY moliyaviy ko'rinishi.
 *
 * <p>Mavjud {@link DashboardStatsResponse} (balans/daromad/xarajat/byudjet/jamg'arma/qarz)
 * va oxirgi tranzaksiyalarni qayta ishlatadi. Faqat {@code @RequiresSuperAdmin} endpoint'idan
 * to'ldiriladi.</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FinancialOverviewResponse {
    private Long scopeId;
    private String scopeName;
    private String scopeType;
    private DashboardStatsResponse stats;
    private List<TransactionResponse> recentTransactions;
}
