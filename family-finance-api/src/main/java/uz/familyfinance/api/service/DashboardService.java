package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.dto.response.ChartDataResponse;
import uz.familyfinance.api.dto.response.CurrencyBalanceResponse;
import uz.familyfinance.api.dto.response.DashboardStatsResponse;
import uz.familyfinance.api.entity.Budget;
import uz.familyfinance.api.entity.Category;
import uz.familyfinance.api.entity.SavingsGoal;
import uz.familyfinance.api.enums.CategoryType;
import uz.familyfinance.api.enums.TransactionType;
import uz.familyfinance.api.repository.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DashboardService {

    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;
    private final BudgetRepository budgetRepository;
    private final SavingsGoalRepository savingsGoalRepository;
    private final DebtRepository debtRepository;
    private final CategoryRepository categoryRepository;
    private final ScopeContextService scopeContext;

    @Transactional(readOnly = true)
    public DashboardStatsResponse getStats() {
        return getStats(scopeContext.getActiveScopeId());
    }

    /**
     * Berilgan scope bo'yicha statistika. SUPER_ADMIN bitta oilani read-only ko'rishi uchun
     * tanlangan scopeId bilan ham chaqiriladi ({@code AdminOverviewService}).
     */
    @Transactional(readOnly = true)
    public DashboardStatsResponse getStats(Long scopeId) {
        LocalDate now = LocalDate.now();
        LocalDateTime monthStart = now.withDayOfMonth(1).atStartOfDay();
        LocalDateTime monthEnd = now.plusMonths(1).withDayOfMonth(1).atStartOfDay().minusSeconds(1);

        BigDecimal totalIncome = transactionRepository.sumByTypeAndDateRangeAndScope(
                TransactionType.INCOME, monthStart, monthEnd, scopeId);
        BigDecimal totalExpense = transactionRepository.sumByTypeAndDateRangeAndScope(
                TransactionType.EXPENSE, monthStart, monthEnd, scopeId);

        List<Budget> activeBudgets = budgetRepository.findActiveByDateAndScope(now, scopeId);

        // Har bir byudjetning "sarfi" O'Z davri (startDate..endDate) bo'yicha hisoblanadi.
        // Avval barcha byudjetlarning min(start)..max(end) BIRLASHGAN oralig'i ishlatilardi —
        // natijada yillik byudjet bilan yonma-yon turgan oylik byudjet boshqa oydagi
        // xarajatni ham "o'ziniki" deb ko'rsatib, dashboard BudgetService.toResponse bilan
        // zid (masalan 110% "oshib ketgan") javob berardi.
        List<DashboardStatsResponse.BudgetProgress> budgetProgress = activeBudgets.stream()
                .map(b -> {
                    LocalDateTime from = b.getStartDate().atStartOfDay();
                    LocalDateTime to = b.getEndDate().atTime(23, 59, 59);
                    BigDecimal spent = transactionRepository.sumExpenseByCategoryAndScopeAndDateRange(
                            b.getCategory().getId(), scopeId, from, to);
                    double pct = b.getAmount().compareTo(BigDecimal.ZERO) > 0
                            ? spent.multiply(BigDecimal.valueOf(100)).divide(b.getAmount(), 2, RoundingMode.HALF_UP).doubleValue() : 0;
                    return DashboardStatsResponse.BudgetProgress.builder()
                            .categoryName(b.getCategory().getName())
                            .budgetAmount(b.getAmount())
                            .spentAmount(spent)
                            .percentage(pct)
                            .build();
                }).toList();

        List<SavingsGoal> activeGoals = savingsGoalRepository.findByIsCompletedFalseAndScope(scopeId);
        List<DashboardStatsResponse.SavingsProgress> savingsProgress = activeGoals.stream()
                .map(g -> {
                    double pct = g.getTargetAmount().compareTo(BigDecimal.ZERO) > 0
                            ? g.getCurrentAmount().multiply(BigDecimal.valueOf(100)).divide(g.getTargetAmount(), 2, RoundingMode.HALF_UP).doubleValue() : 0;
                    return DashboardStatsResponse.SavingsProgress.builder()
                            .goalName(g.getName())
                            .targetAmount(g.getTargetAmount())
                            .currentAmount(g.getCurrentAmount())
                            .percentage(pct)
                            .build();
                }).toList();

        List<CurrencyBalanceResponse> balancesByCurrency = accountRepository.getBalancesByCurrencyAndScope(scopeId)
                .stream().map(row -> new CurrencyBalanceResponse((String) row[0], (BigDecimal) row[1])).toList();
        BigDecimal primaryBalance = balancesByCurrency.isEmpty() ? BigDecimal.ZERO : balancesByCurrency.get(0).amount();

        return DashboardStatsResponse.builder()
                .totalBalance(primaryBalance)
                .balancesByCurrency(balancesByCurrency)
                .totalIncome(totalIncome)
                .totalExpense(totalExpense)
                .totalSavings(savingsGoalRepository.getTotalSavingsByScope(scopeId))
                .totalDebtsGiven(debtRepository.sumRemainingByTypeAndScope(uz.familyfinance.api.enums.DebtType.GIVEN, scopeId))
                .totalDebtsTaken(debtRepository.sumRemainingByTypeAndScope(uz.familyfinance.api.enums.DebtType.TAKEN, scopeId))
                .activeGoals(activeGoals.size())
                .activeBudgets(activeBudgets.size())
                .budgetProgress(budgetProgress)
                .savingsProgress(savingsProgress)
                .build();
    }

    @Transactional(readOnly = true)
    public ChartDataResponse getCharts() {
        LocalDate now = LocalDate.now();

        // D1-c: scope-aware
        Long scopeId = scopeContext.getActiveScopeId();

        // 6 oy trend - bitta batch query bilan
        LocalDate sixMonthsAgo = now.minusMonths(5).withDayOfMonth(1);
        LocalDateTime trendFrom = sixMonthsAgo.atStartOfDay();
        LocalDateTime trendTo = now.plusMonths(1).withDayOfMonth(1).atStartOfDay().minusSeconds(1);

        // {month -> {type -> sum}} map yaratish
        Map<Integer, Map<TransactionType, BigDecimal>> monthlyMap = new HashMap<>();
        for (Object[] row : transactionRepository.sumByTypeGroupedByMonthAndScope(trendFrom, trendTo, scopeId)) {
            TransactionType type = (TransactionType) row[0];
            int month = ((Number) row[1]).intValue();
            BigDecimal sum = (BigDecimal) row[2];
            monthlyMap.computeIfAbsent(month, k -> new HashMap<>()).put(type, sum);
        }

        List<ChartDataResponse.MonthlyData> monthlyTrend = new ArrayList<>();
        for (int i = 5; i >= 0; i--) {
            LocalDate month = now.minusMonths(i);
            int monthValue = month.getMonthValue();
            Map<TransactionType, BigDecimal> sums = monthlyMap.getOrDefault(monthValue, Map.of());
            monthlyTrend.add(ChartDataResponse.MonthlyData.builder()
                    .month(month.getMonth().name())
                    .income(sums.getOrDefault(TransactionType.INCOME, BigDecimal.ZERO))
                    .expense(sums.getOrDefault(TransactionType.EXPENSE, BigDecimal.ZERO))
                    .build());
        }

        // Category data - bitta batch query bilan (joriy oy)
        LocalDateTime monthStart = now.withDayOfMonth(1).atStartOfDay();
        LocalDateTime monthEnd = now.plusMonths(1).withDayOfMonth(1).atStartOfDay().minusSeconds(1);

        // Expense by category - batch
        List<Category> expenseCategories = categoryRepository.findByTypeAndIsActiveTrue(CategoryType.EXPENSE);
        Map<Long, BigDecimal> expenseMap = transactionRepository
                .sumExpenseGroupedByCategoryAndScope(monthStart, monthEnd, scopeId).stream()
                .collect(Collectors.toMap(row -> (Long) row[0], row -> (BigDecimal) row[1]));
        BigDecimal totalExpense = expenseMap.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);

        List<ChartDataResponse.CategoryData> expenseByCategory = expenseCategories.stream()
                .map(c -> {
                    BigDecimal amount = expenseMap.getOrDefault(c.getId(), BigDecimal.ZERO);
                    double pct = totalExpense.compareTo(BigDecimal.ZERO) > 0
                            ? amount.multiply(BigDecimal.valueOf(100)).divide(totalExpense, 2, RoundingMode.HALF_UP).doubleValue() : 0;
                    return ChartDataResponse.CategoryData.builder()
                            .name(c.getName()).amount(amount).color(c.getColor()).percentage(pct).build();
                })
                .filter(d -> d.getAmount().compareTo(BigDecimal.ZERO) > 0)
                .toList();

        // Income by category - batch
        List<Category> incomeCategories = categoryRepository.findByTypeAndIsActiveTrue(CategoryType.INCOME);
        Map<Long, BigDecimal> incomeMap = transactionRepository
                .sumIncomeGroupedByCategoryAndScope(monthStart, monthEnd, scopeId).stream()
                .collect(Collectors.toMap(row -> (Long) row[0], row -> (BigDecimal) row[1]));
        BigDecimal totalIncome = incomeMap.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);

        List<ChartDataResponse.CategoryData> incomeByCategory = incomeCategories.stream()
                .map(c -> {
                    BigDecimal amount = incomeMap.getOrDefault(c.getId(), BigDecimal.ZERO);
                    double pct = totalIncome.compareTo(BigDecimal.ZERO) > 0
                            ? amount.multiply(BigDecimal.valueOf(100)).divide(totalIncome, 2, RoundingMode.HALF_UP).doubleValue() : 0;
                    return ChartDataResponse.CategoryData.builder()
                            .name(c.getName()).amount(amount).color(c.getColor()).percentage(pct).build();
                })
                .filter(d -> d.getAmount().compareTo(BigDecimal.ZERO) > 0)
                .toList();

        return ChartDataResponse.builder()
                .monthlyTrend(monthlyTrend)
                .expenseByCategory(expenseByCategory)
                .incomeByCategory(incomeByCategory)
                .build();
    }
}
