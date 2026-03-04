package uz.familyfinance.api.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

@Data
public class PointSavingsRequest {

    @NotNull
    @Positive
    private Integer amount;
}
