package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.dto.response.export.CategoryReportExportRow;
import uz.familyfinance.api.dto.response.export.IncomeExpenseExportRow;
import uz.familyfinance.api.dto.response.export.MemberReportExportRow;
import uz.familyfinance.api.enums.CategoryType;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * ReportService natijalarini export uchun mos qatorlarga aylantirish.
 */
@Service
@RequiredArgsConstructor
public class ReportExportService {

    private final ReportService reportService;

    @Transactional(readOnly = true)
    public List<IncomeExpenseExportRow> buildIncomeExpenseRows(LocalDateTime from, LocalDateTime to) {
        Map<String, Object> report = reportService.getIncomeExpenseReport(from, to);
        BigDecimal income = (BigDecimal) report.getOrDefault("totalIncome", BigDecimal.ZERO);
        BigDecimal expense = (BigDecimal) report.getOrDefault("totalExpense", BigDecimal.ZERO);
        BigDecimal balance = income.subtract(expense);

        return List.of(
                IncomeExpenseExportRow.builder().label("Jami daromad").amount(income).build(),
                IncomeExpenseExportRow.builder().label("Jami xarajat").amount(expense).build(),
                IncomeExpenseExportRow.builder().label("Sof balans").amount(balance).build()
        );
    }

    @Transactional(readOnly = true)
    public List<CategoryReportExportRow> buildCategoryRows(CategoryType type, LocalDateTime from, LocalDateTime to) {
        return reportService.getCategoryReport(type, from, to).stream()
                .map(row -> CategoryReportExportRow.builder()
                        .categoryName((String) row.get("categoryName"))
                        .amount((BigDecimal) row.get("amount"))
                        .percentage(toDouble(row.get("percentage")))
                        .build())
                .toList();
    }

    @Transactional(readOnly = true)
    public List<MemberReportExportRow> buildMemberRows(LocalDateTime from, LocalDateTime to) {
        return reportService.getMemberReport(from, to).stream()
                .map(row -> MemberReportExportRow.builder()
                        .memberName((String) row.get("memberName"))
                        .totalExpense((BigDecimal) row.get("totalExpense"))
                        .build())
                .toList();
    }

    private Double toDouble(Object value) {
        if (value == null) return 0.0;
        if (value instanceof Double d) return d;
        if (value instanceof Number n) return n.doubleValue();
        return 0.0;
    }
}
