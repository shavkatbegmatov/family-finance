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
@ExportEntity(sheetName = "Kategoriya", title = "Kategoriya bo'yicha Hisobot")
public class CategoryReportExportRow {

    @ExportColumn(header = "Kategoriya", order = 1)
    private String categoryName;

    @ExportColumn(header = "Summa", order = 2, type = ColumnType.CURRENCY)
    private BigDecimal amount;

    @ExportColumn(header = "Ulush (%)", order = 3, type = ColumnType.NUMBER, format = "#,##0.00")
    private Double percentage;
}
