package uz.familyfinance.api.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AddPartnerRequest {
    @NotNull private Long personId;
}
