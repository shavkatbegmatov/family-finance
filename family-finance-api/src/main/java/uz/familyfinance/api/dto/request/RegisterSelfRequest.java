package uz.familyfinance.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;
import uz.familyfinance.api.enums.Gender;

@Data
public class RegisterSelfRequest {
    @NotBlank @Size(max = 100) private String fullName;
    @NotNull private Gender gender;
}
