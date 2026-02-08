package uz.familyfinance.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;
import uz.familyfinance.api.enums.DebtType;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class DebtRequest {
    @NotNull private DebtType type;
    @NotBlank private String personName;
    private String personPhone;
    @NotNull @Positive private BigDecimal amount;
    private LocalDate dueDate;
    private String description;
}
