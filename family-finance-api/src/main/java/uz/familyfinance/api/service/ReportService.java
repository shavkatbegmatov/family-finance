package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.entity.Category;
import uz.familyfinance.api.entity.FamilyMember;
import uz.familyfinance.api.enums.CategoryType;
import uz.familyfinance.api.enums.TransactionType;
import uz.familyfinance.api.repository.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportService {

    private final TransactionRepository transactionRepository;
    private final CategoryRepository categoryRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final BudgetRepository budgetRepository;
    private final ScopeContextService scopeContext;

    /**
     * Aktiv scope'ga mos family_group ID ni qaytaradi.
     * SUPER_ADMIN bo'lsa null — global hisobotlar.
     * Aks holda fallback ketma-ketligi orqali doim bir qiymat: -1L ham xavfsiz.
     */
    private Long resolveFamilyGroupIdOrNull() {
        if (scopeContext.isSuperAdmin()) {
            return null;
        }
        try {
            Long fromScope = scopeContext.getActiveFamilyGroupOptional()
                    .map(fg -> fg.getId())
                    .orElse(null);
            if (fromScope != null) return fromScope;
        } catch (Exception e) {
            log.debug("Aktiv scope'dan family group olib bo'lmadi: {}", e.getMessage());
        }
        // Legacy fallback
        if (scopeContext.getCurrentUserDetails() != null
                && scopeContext.getCurrentUserDetails().getUser() != null
                && scopeContext.getCurrentUserDetails().getUser().getFamilyGroup() != null) {
            return scopeContext.getCurrentUserDetails().getUser().getFamilyGroup().getId();
        }
        return -1L;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getIncomeExpenseReport(LocalDateTime from, LocalDateTime to) {
        Long familyGroupId = resolveFamilyGroupIdOrNull();
        BigDecimal income;
        BigDecimal expense;
        if (familyGroupId == null) {
            income = transactionRepository.sumByTypeAndDateRange(TransactionType.INCOME, from, to);
            expense = transactionRepository.sumByTypeAndDateRange(TransactionType.EXPENSE, from, to);
        } else {
            income = transactionRepository.sumByTypeAndDateRangeAndFamilyGroup(
                    TransactionType.INCOME, from, to, familyGroupId);
            expense = transactionRepository.sumByTypeAndDateRangeAndFamilyGroup(
                    TransactionType.EXPENSE, from, to, familyGroupId);
        }
        Map<String, Object> report = new HashMap<>();
        report.put("totalIncome", income);
        report.put("totalExpense", expense);
        report.put("from", from);
        report.put("to", to);
        return report;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getCategoryReport(CategoryType type, LocalDateTime from, LocalDateTime to) {
        Long familyGroupId = resolveFamilyGroupIdOrNull();
        List<Category> categories = categoryRepository.findByTypeAndIsActiveTrue(type);
        boolean isExpense = type == CategoryType.EXPENSE;

        // Barcha kategoriyalar uchun yagona batch query — N+1 yo'q
        Map<Long, BigDecimal> amountByCategory;
        if (familyGroupId == null) {
            amountByCategory = isExpense
                    ? transactionRepository.sumExpenseGroupedByCategory(from, to).stream()
                            .collect(Collectors.toMap(row -> (Long) row[0], row -> (BigDecimal) row[1]))
                    : transactionRepository.sumIncomeGroupedByCategory(from, to).stream()
                            .collect(Collectors.toMap(row -> (Long) row[0], row -> (BigDecimal) row[1]));
        } else {
            amountByCategory = isExpense
                    ? transactionRepository.sumExpenseGroupedByCategoryAndFamilyGroup(from, to, familyGroupId).stream()
                            .collect(Collectors.toMap(row -> (Long) row[0], row -> (BigDecimal) row[1]))
                    : transactionRepository.sumIncomeGroupedByCategoryAndFamilyGroup(from, to, familyGroupId).stream()
                            .collect(Collectors.toMap(row -> (Long) row[0], row -> (BigDecimal) row[1]));
        }

        BigDecimal total = amountByCategory.values().stream()
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return categories.stream().map(c -> {
            BigDecimal amount = amountByCategory.getOrDefault(c.getId(), BigDecimal.ZERO);
            Map<String, Object> item = new HashMap<>();
            item.put("categoryId", c.getId());
            item.put("categoryName", c.getName());
            item.put("amount", amount);
            item.put("percentage", total.compareTo(BigDecimal.ZERO) > 0
                    ? amount.multiply(BigDecimal.valueOf(100)).divide(total, 2, RoundingMode.HALF_UP).doubleValue() : 0);
            return item;
        }).sorted((a, b) -> ((BigDecimal) b.get("amount")).compareTo((BigDecimal) a.get("amount")))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getMemberReport(LocalDateTime from, LocalDateTime to) {
        Long familyGroupId = resolveFamilyGroupIdOrNull();
        // Scope-aware: faqat shu familyGroup'ning faol a'zolari
        List<FamilyMember> members;
        if (familyGroupId == null) {
            members = familyMemberRepository.findByIsActiveTrue();
        } else {
            members = familyMemberRepository.findAccessibleActiveMembers(familyGroupId, false);
        }

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
