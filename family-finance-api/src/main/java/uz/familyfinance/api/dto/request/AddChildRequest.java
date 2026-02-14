package uz.familyfinance.api.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import uz.familyfinance.api.enums.LineageType;

@Data
public class AddChildRequest {
    @NotNull private Long personId;
    private LineageType lineageType;
    private Integer birthOrder;
}
