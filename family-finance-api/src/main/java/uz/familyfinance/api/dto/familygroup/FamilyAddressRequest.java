package uz.familyfinance.api.dto.familygroup;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FamilyAddressRequest {
    @NotBlank(message = "Manzil bo'sh bo'lishi mumkin emas")
    private String address;

    // Optional, backdated moves
    private LocalDate moveInDate;

    // Optional, explicit move out date
    private LocalDate moveOutDate;
}
