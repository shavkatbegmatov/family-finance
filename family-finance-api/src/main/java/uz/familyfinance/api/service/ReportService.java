package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.dto.response.ChartDataResponse;
import uz.familyfinance.api.entity.Category;
import uz.familyfinance.api.entity.FamilyMember;
import uz.familyfinance.api.enums.CategoryType;
import uz.familyfinance.api.enums.TransactionType;
import uz.familyfinance.api.repository.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportService {

    private final TransactionRepository transactionRepository;
    private final CategoryRepository categoryRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final BudgetRepository budgetRepository;

    @Transactional(readOnly = true)
    public Map<String, Object> getIncomeExpenseReport(LocalDateTime from, LocalDateTime to) {
        Map<String, Object> report = new HashMap<>();
        report.put("totalIncome", transactionRepository.sumByTypeAndDateRange(TransactionType.INCOME, from, to));
        report.put("totalExpense", transactionRepository.sumByTypeAndDateRange(TransactionType.EXPENSE, from, to));
        report.put("from", from);
        report.put("to", to);
        return report;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getCategoryReport(CategoryType type, LocalDateTime from, LocalDateTime to) {
        List<Category> categories = categoryRepository.findByTypeAndIsActiveTrue(type);
        TransactionType txType = type == CategoryType.EXPENSE ? TransactionType.EXPENSE : TransactionType.INCOME;
        BigDecimal total = transactionRepository.sumByTypeAndDateRange(txType, from, to);

        return categories.stream().map(c -> {
            BigDecimal amount = transactionRepository.sumExpenseByCategoryAndDateRange(c.getId(), from, to);
            Map<String, Object> item = new HashMap<>();
            item.put("categoryId", c.getId());
            item.put("categoryName", c.getName());
            item.put("amount", amount);
            item.put("percentage", total.compareTo(BigDecimal.ZERO) > 0
                    ? amount.multiply(BigDecimal.valueOf(100)).divide(total, 2, RoundingMode.HALF_UP).doubleValue() : 0);
            return item;
        }).filter(m -> ((BigDecimal) m.get("amount")).compareTo(BigDecimal.ZERO) > 0)
                .sorted((a, b) -> ((BigDecimal) b.get("amount")).compareTo((BigDecimal) a.get("amount")))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getMemberReport(LocalDateTime from, LocalDateTime to) {
        List<FamilyMember> members = familyMemberRepository.findByIsActiveTrue();
        return members.stream().map(m -> {
            BigDecimal expense = transactionRepository.sumExpenseByMemberAndDateRange(m.getId(), from, to);
            Map<String, Object> item = new HashMap<>();
            item.put("memberId", m.getId());
            item.put("memberName", m.getFullName());
            item.put("totalExpense", expense);
            return item;
        }).sorted((a, b) -> ((BigDecimal) b.get("totalExpense")).compareTo((BigDecimal) a.get("totalExpense")))
                .toList();
    }
}
