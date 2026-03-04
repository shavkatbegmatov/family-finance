package uz.familyfinance.api.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

@Data
public class PointConversionRequest {

    @NotNull
    private Long participantId;

    @NotNull
    @Positive
    private Integer points;

    private Long targetAccountId;
}
