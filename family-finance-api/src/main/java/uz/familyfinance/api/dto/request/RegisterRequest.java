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
public class RegisterRequest {

    @NotBlank(message = "Ism-familiya kiritilishi shart")
    @Size(min = 2, max = 100, message = "Ism-familiya 2-100 belgi orasida bo'lishi kerak")
    private String fullName;

    @NotBlank(message = "Username kiritilishi shart")
    @Size(min = 3, max = 50, message = "Username 3-50 belgi orasida bo'lishi kerak")
    private String username;

    @NotBlank(message = "Parol kiritilishi shart")
    @Size(min = 6, max = 100, message = "Parol 6-100 belgi orasida bo'lishi kerak")
    private String password;

    @NotBlank(message = "Parolni tasdiqlash kiritilishi shart")
    private String confirmPassword;

    @Email(message = "Email formati noto'g'ri")
    @Size(max = 100)
    private String email;

    @Size(max = 20)
    private String phone;
}
