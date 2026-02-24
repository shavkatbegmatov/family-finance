package uz.familyfinance.api.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateUserRequest {

    @NotBlank(message = "To'liq ism kiritilishi shart")
    @Size(min = 2, max = 100, message = "Ism 2-100 belgi orasida bo'lishi kerak")
    private String fullName;

    @Email(message = "Email formati noto'g'ri")
    @Size(max = 100)
    private String email;

    @Size(max = 20)
    private String phone;
}
