package uz.familyfinance.api.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.familyfinance.api.enums.Gender;
import uz.familyfinance.api.util.PasswordPolicy;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RegisterRequest {

    @NotBlank(message = "Ism kiritilishi shart")
    @Size(min = 2, max = 100, message = "Ism 2-100 belgi orasida bo'lishi kerak")
    private String firstName;

    @Size(max = 100, message = "Familiya 100 belgidan oshmasligi kerak")
    private String lastName;

    @NotBlank(message = "Username kiritilishi shart")
    @Size(min = 3, max = 50, message = "Username 3-50 belgi orasida bo'lishi kerak")
    private String username;

    @NotBlank(message = "Parol kiritilishi shart")
    @Size(min = PasswordPolicy.MIN_LENGTH, max = PasswordPolicy.MAX_LENGTH, message = "Parol {min}-{max} belgi orasida bo'lishi kerak")
    private String password;

    @NotBlank(message = "Parolni tasdiqlash kiritilishi shart")
    private String confirmPassword;

    @Email(message = "Email formati noto'g'ri")
    @Size(max = 100)
    private String email;

    @Size(max = 20)
    private String phone;

    @NotNull(message = "Jins tanlanishi shart")
    private Gender gender;

    /**
     * Ixtiyoriy: Oila taklif kodi. Bo'lsa — mavjud scope'ga MEMBER bo'lib qo'shiladi,
     * bo'lmasa — yangi GROUP+HOUSEHOLD avtomatik yaratiladi (auto-provisioning).
     * Format: prefiks (C/H) + 10 ta belgi, masalan "CABCDEF2345".
     */
    @Size(max = 32, message = "Taklif kodi 32 belgidan oshmasligi kerak")
    private String inviteCode;

    /**
     * Ism, familiya va otasining ismidan to'liq ism yaratish
     */
    public String getFullName() {
        StringBuilder sb = new StringBuilder();
        if (lastName != null && !lastName.isBlank()) {
            sb.append(lastName.trim());
        }
        if (firstName != null && !firstName.isBlank()) {
            if (!sb.isEmpty()) sb.append(" ");
            sb.append(firstName.trim());
        }
        return sb.toString();
    }
}
