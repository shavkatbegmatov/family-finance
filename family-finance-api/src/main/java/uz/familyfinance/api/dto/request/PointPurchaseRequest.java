package uz.familyfinance.api.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PointPurchaseRequest {

    @NotNull
    private Long participantId;

    @NotNull
    private Long shopItemId;
}
