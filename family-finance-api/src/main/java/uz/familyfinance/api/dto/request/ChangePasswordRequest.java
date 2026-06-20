package uz.familyfinance.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.familyfinance.api.util.PasswordPolicy;

/**
 * Request for changing user password.
 * Used for both first-time password change and regular password change.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChangePasswordRequest {

    @NotBlank(message = "Joriy parol kiritilishi shart")
    private String currentPassword;

    @NotBlank(message = "Yangi parol kiritilishi shart")
    @Size(min = PasswordPolicy.MIN_LENGTH, max = PasswordPolicy.MAX_LENGTH, message = "Parol {min}-{max} belgi oralig'ida bo'lishi kerak")
    private String newPassword;

    @NotBlank(message = "Parolni tasdiqlash kiritilishi shart")
    private String confirmPassword;
}
