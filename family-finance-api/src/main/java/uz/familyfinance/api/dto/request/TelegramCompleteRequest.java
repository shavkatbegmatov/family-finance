package uz.familyfinance.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;
import uz.familyfinance.api.enums.Gender;
import uz.familyfinance.api.util.PasswordPolicy;

/**
 * Telegram orqali yangi ro'yxatdan o'tishni yakunlash — foydalanuvchi formani to'ldiradi.
 * Jins majburiy (Blok A bilan izchil — shajara izchilligi uchun).
 */
@Data
public class TelegramCompleteRequest {

    @NotBlank(message = "So'rov identifikatori kerak")
    private String requestId;

    @NotBlank(message = "Ism kiritilishi shart")
    @Size(min = 2, max = 100, message = "Ism 2-100 belgi orasida bo'lishi kerak")
    private String firstName;

    @Size(max = 100, message = "Familiya 100 belgidan oshmasligi kerak")
    private String lastName;

    @NotNull(message = "Jins tanlanishi shart")
    private Gender gender;

    @NotBlank(message = "PIN-kod kiritilishi shart")
    @Pattern(regexp = "\\d{4,6}", message = "PIN 4-6 raqamdan iborat bo'lishi kerak")
    private String pin;

    /** Ixtiyoriy zaxira parol — PIN unutilsa username+parol bilan kirish uchun. */
    @Size(min = PasswordPolicy.MIN_LENGTH, max = PasswordPolicy.MAX_LENGTH,
            message = "Parol {min}-{max} belgi orasida bo'lishi kerak")
    private String password;

    @Size(max = 32, message = "Taklif kodi 32 belgidan oshmasligi kerak")
    private String inviteCode;
}
