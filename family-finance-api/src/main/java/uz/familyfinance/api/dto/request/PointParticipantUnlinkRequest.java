package uz.familyfinance.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class PointParticipantUnlinkRequest {

    @NotBlank(message = "Bog'lanishni uzish sababi majburiy")
    @Size(min = 10, max = 500, message = "Sabab 10-500 belgi oralig'ida bo'lishi kerak")
    private String reason;
}
