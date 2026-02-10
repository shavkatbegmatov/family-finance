package uz.familyfinance.api.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Positive;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class SavingsContributionRequest {
    @NotNull @Positive private BigDecimal amount;
    @NotNull @PastOrPresent(message = "Jamg'arma sanasi kelajakda bo'lishi mumkin emas") private LocalDate contributionDate;
    private String note;
}
