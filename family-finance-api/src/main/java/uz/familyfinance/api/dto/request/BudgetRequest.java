package uz.familyfinance.api.dto.request;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;
import uz.familyfinance.api.enums.BudgetPeriod;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class BudgetRequest {
    @NotNull private Long categoryId;
    @NotNull @Positive private BigDecimal amount;
    @NotNull private BudgetPeriod period;
    @NotNull private LocalDate startDate;
    @NotNull private LocalDate endDate;

    @AssertTrue(message = "Tugash sanasi boshlanish sanasidan keyin bo'lishi kerak")
    public boolean isDateRangeValid() {
        if (startDate == null || endDate == null) return true;
        return !endDate.isBefore(startDate);
    }
}
