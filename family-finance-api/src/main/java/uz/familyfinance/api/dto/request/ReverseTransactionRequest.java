package uz.familyfinance.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ReverseTransactionRequest {
    @NotBlank(message = "Storno sababi ko'rsatilishi shart")
    private String reason;
}
