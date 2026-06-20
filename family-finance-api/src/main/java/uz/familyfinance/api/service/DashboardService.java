package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.dto.response.ChartDataResponse;
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
        LocalDate now = LocalDate.now();
        LocalDateTime monthStart = now.withDayOfMonth(1).atStartOfDay();
        LocalDateTime monthEnd = now.plusMonths(1).withDayOfMonth(1).atStartOfDay().minusSeconds(1);

        // D1-c: scope-aware — transactions/balans endi to'g'ridan aktiv scope_id bo'yicha
        Long scopeId = scopeContext.getActiveScopeId();

        BigDecimal totalIncome = transactionRepository.sumByTypeAndDateRangeAndScope(
                TransactionType.INCOME, monthStart, monthEnd, scopeId);
        BigDecimal totalExpense = transactionRepository.sumByTypeAndDateRangeAndScope(
                TransactionType.EXPENSE, monthStart, monthEnd, scopeId);

        List<Budget> activeBudgets = budgetRepository.findActiveByDateAndScope(now, scopeId);

        // Batch: barcha budget category'lar uchun bitta query bilan expense sumlarni olish
        List<DashboardStatsResponse.BudgetProgress> budgetProgress;
        if (!activeBudgets.isEmpty()) {
            List<Long> budgetCategoryIds = activeBudgets.stream()
                    .map(b -> b.getCategory().getId()).toList();
            // Budget'larning eng keng date range'ini topish
            LocalDateTime budgetFrom = activeBudgets.stream()
                    .map(b -> b.getStartDate().atStartOfDay())
                    .min(LocalDateTime::compareTo).orElse(monthStart);
            LocalDateTime budgetTo = activeBudgets.stream()
                    .map(b -> b.getEndDate().atTime(23, 59, 59))
                    .max(LocalDateTime::compareTo).orElse(monthEnd);

            Map<Long, BigDecimal> spentMap = transactionRepository
                    .sumExpenseByCategoryIdsAndScope(budgetCategoryIds, budgetFrom, budgetTo, scopeId).stream()
                    .collect(Collectors.toMap(
                            row -> (Long) row[0],
                            row -> (BigDecimal) row[1]));

            budgetProgress = activeBudgets.stream()
                    .map(b -> {
                        BigDecimal spent = spentMap.getOrDefault(b.getCategory().getId(), BigDecimal.ZERO);
                        double pct = b.getAmount().compareTo(BigDecimal.ZERO) > 0
                                ? spent.multiply(BigDecimal.valueOf(100)).divide(b.getAmount(), 2, RoundingMode.HALF_UP).doubleValue() : 0;
                        return DashboardStatsResponse.BudgetProgress.builder()
                                .categoryName(b.getCategory().getName())
                                .budgetAmount(b.getAmount())
                                .spentAmount(spent)
                                .percentage(pct)
                                .build();
                    }).toList();
        } else {
            budgetProgress = List.of();
        }

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

        return DashboardStatsResponse.builder()
                .totalBalance(accountRepository.getTotalBalanceByScopeId(scopeId))
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
