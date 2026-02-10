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
import java.util.List;

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

    @Transactional(readOnly = true)
    public DashboardStatsResponse getStats() {
        LocalDate now = LocalDate.now();
        LocalDateTime monthStart = now.withDayOfMonth(1).atStartOfDay();
        LocalDateTime monthEnd = now.plusMonths(1).withDayOfMonth(1).atStartOfDay().minusSeconds(1);

        BigDecimal totalIncome = transactionRepository.sumByTypeAndDateRange(TransactionType.INCOME, monthStart, monthEnd);
        BigDecimal totalExpense = transactionRepository.sumByTypeAndDateRange(TransactionType.EXPENSE, monthStart, monthEnd);

        List<Budget> activeBudgets = budgetRepository.findActiveByDate(now);
        List<DashboardStatsResponse.BudgetProgress> budgetProgress = activeBudgets.stream()
                .map(b -> {
                    BigDecimal spent = transactionRepository.sumExpenseByCategoryAndDateRange(
                            b.getCategory().getId(), b.getStartDate().atStartOfDay(), b.getEndDate().atTime(23, 59, 59));
                    double pct = b.getAmount().compareTo(BigDecimal.ZERO) > 0
                            ? spent.multiply(BigDecimal.valueOf(100)).divide(b.getAmount(), 2, RoundingMode.HALF_UP).doubleValue() : 0;
                    return DashboardStatsResponse.BudgetProgress.builder()
                            .categoryName(b.getCategory().getName())
                            .budgetAmount(b.getAmount())
                            .spentAmount(spent)
                            .percentage(pct)
                            .build();
                }).toList();

        List<SavingsGoal> activeGoals = savingsGoalRepository.findByIsCompletedFalse();
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
                .totalBalance(accountRepository.getTotalBalance())
                .totalIncome(totalIncome)
                .totalExpense(totalExpense)
                .totalSavings(savingsGoalRepository.getTotalSavings())
                .totalDebtsGiven(debtRepository.sumRemainingByType(uz.familyfinance.api.enums.DebtType.GIVEN))
                .totalDebtsTaken(debtRepository.sumRemainingByType(uz.familyfinance.api.enums.DebtType.TAKEN))
                .activeGoals(activeGoals.size())
                .activeBudgets(activeBudgets.size())
                .budgetProgress(budgetProgress)
                .savingsProgress(savingsProgress)
                .build();
    }

    @Transactional(readOnly = true)
    public ChartDataResponse getCharts() {
        LocalDate now = LocalDate.now();
        List<ChartDataResponse.MonthlyData> monthlyTrend = new ArrayList<>();

        // Last 6 months trend
        for (int i = 5; i >= 0; i--) {
            LocalDate month = now.minusMonths(i);
            LocalDateTime from = month.withDayOfMonth(1).atStartOfDay();
            LocalDateTime to = month.plusMonths(1).withDayOfMonth(1).atStartOfDay().minusSeconds(1);
            BigDecimal income = transactionRepository.sumByTypeAndDateRange(TransactionType.INCOME, from, to);
            BigDecimal expense = transactionRepository.sumByTypeAndDateRange(TransactionType.EXPENSE, from, to);
            monthlyTrend.add(ChartDataResponse.MonthlyData.builder()
                    .month(month.getMonth().name())
                    .income(income)
                    .expense(expense)
                    .build());
        }

        // Expense by category (current month)
        LocalDateTime monthStart = now.withDayOfMonth(1).atStartOfDay();
        LocalDateTime monthEnd = now.plusMonths(1).withDayOfMonth(1).atStartOfDay().minusSeconds(1);

        List<Category> expenseCategories = categoryRepository.findByTypeAndIsActiveTrue(CategoryType.EXPENSE);
        BigDecimal totalExpense = transactionRepository.sumByTypeAndDateRange(TransactionType.EXPENSE, monthStart, monthEnd);

        List<ChartDataResponse.CategoryData> expenseByCategory = expenseCategories.stream()
                .map(c -> {
                    BigDecimal amount = transactionRepository.sumExpenseByCategoryAndDateRange(c.getId(), monthStart, monthEnd);
                    double pct = totalExpense.compareTo(BigDecimal.ZERO) > 0
                            ? amount.multiply(BigDecimal.valueOf(100)).divide(totalExpense, 2, RoundingMode.HALF_UP).doubleValue() : 0;
                    return ChartDataResponse.CategoryData.builder()
                            .name(c.getName()).amount(amount).color(c.getColor()).percentage(pct).build();
                })
                .filter(d -> d.getAmount().compareTo(BigDecimal.ZERO) > 0)
                .toList();

        List<Category> incomeCategories = categoryRepository.findByTypeAndIsActiveTrue(CategoryType.INCOME);
        BigDecimal totalIncome = transactionRepository.sumByTypeAndDateRange(TransactionType.INCOME, monthStart, monthEnd);

        List<ChartDataResponse.CategoryData> incomeByCategory = incomeCategories.stream()
                .map(c -> {
                    BigDecimal amount = transactionRepository.sumIncomeByCategoryAndDateRange(c.getId(), monthStart, monthEnd);
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
