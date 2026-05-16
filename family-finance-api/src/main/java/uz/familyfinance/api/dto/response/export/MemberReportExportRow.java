package uz.familyfinance.api.dto.response.export;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.familyfinance.api.annotation.ExportColumn;
import uz.familyfinance.api.annotation.ExportColumn.ColumnType;
import uz.familyfinance.api.annotation.ExportEntity;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ExportEntity(sheetName = "Oila a'zolari", title = "Oila A'zolari Bo'yicha Hisobot")
public class MemberReportExportRow {

    @ExportColumn(header = "Oila a'zosi", order = 1)
    private String memberName;

    @ExportColumn(header = "Jami xarajat", order = 2, type = ColumnType.CURRENCY)
    private BigDecimal totalExpense;
}
