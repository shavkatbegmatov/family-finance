package uz.familyfinance.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

/** Telegram tasdiqlanganidan keyin PIN-kod tekshirish (2-faktor). */
@Data
public class TelegramVerifyPinRequest {

    @NotBlank(message = "So'rov identifikatori kerak")
    private String requestId;

    @NotBlank(message = "PIN-kod kiritilishi shart")
    @Pattern(regexp = "\\d{4,6}", message = "PIN 4-6 raqamdan iborat bo'lishi kerak")
    private String pin;
}
