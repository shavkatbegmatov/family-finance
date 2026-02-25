package uz.familyfinance.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChangeUsernameRequest {

    @NotBlank(message = "Yangi username kiritilishi shart")
    @Size(min = 3, max = 50, message = "Username 3-50 belgi orasida bo'lishi kerak")
    @Pattern(
            regexp = "^[a-z][a-z0-9._]{2,49}$",
            message = "Username faqat kichik lotin harflari, raqamlar, nuqta va pastki chiziqdan iborat bo'lishi kerak. Harf bilan boshlanishi shart"
    )
    private String newUsername;
}
