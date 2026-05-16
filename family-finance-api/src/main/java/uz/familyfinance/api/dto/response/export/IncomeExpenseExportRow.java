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
@ExportEntity(sheetName = "Daromad-Xarajat", title = "Daromad va Xarajatlar Hisoboti")
public class IncomeExpenseExportRow {

    @ExportColumn(header = "Ko'rsatkich", order = 1)
    private String label;

    @ExportColumn(header = "Summa", order = 2, type = ColumnType.CURRENCY)
    private BigDecimal amount;
}
