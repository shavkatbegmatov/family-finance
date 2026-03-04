package uz.familyfinance.api.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.time.LocalDate;

@Data
public class PointInvestmentRequest {

    @NotNull
    private String type;

    @NotNull
    @Positive
    private Integer amount;

    private LocalDate maturityDate;
}
