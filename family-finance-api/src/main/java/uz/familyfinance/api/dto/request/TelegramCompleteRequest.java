package uz.familyfinance.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;
import uz.familyfinance.api.enums.Gender;

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

    @Size(max = 32, message = "Taklif kodi 32 belgidan oshmasligi kerak")
    private String inviteCode;
}
