package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.dto.response.DashboardStatsResponse;
import uz.familyfinance.api.dto.response.FinancialOverviewResponse;
import uz.familyfinance.api.entity.Scope;
import uz.familyfinance.api.exception.ResourceNotFoundException;
import uz.familyfinance.api.repository.ScopeRepository;

/**
 * SUPER_ADMIN nazorat uchun bitta scope'ning READ-ONLY moliyaviy ko'rinishini yig'adi.
 *
 * <p>Mavjud {@link DashboardService#getStats(Long)} va
 * {@link TransactionService#getRecentForScope(Long)} mantig'ini qayta ishlatadi (DRY) —
 * faqat tanlangan {@code scopeId} bo'yicha. Yozish/mutatsiya yo'q (super admin'da WRITE huquqi yo'q).</p>
 */
@Service
@RequiredArgsConstructor
public class AdminOverviewService {

    private final ScopeRepository scopeRepository;
    private final DashboardService dashboardService;
    private final TransactionService transactionService;

    @Transactional(readOnly = true)
    public FinancialOverviewResponse getForScope(Long scopeId) {
        Scope scope = scopeRepository.findById(scopeId)
                .orElseThrow(() -> new ResourceNotFoundException("Scope", "id", scopeId));

        DashboardStatsResponse stats = dashboardService.getStats(scopeId);

        return FinancialOverviewResponse.builder()
                .scopeId(scope.getId())
                .scopeName(scope.getName())
                .scopeType(scope.getType().name())
                .stats(stats)
                .recentTransactions(transactionService.getRecentForScope(scopeId))
                .build();
    }
}
