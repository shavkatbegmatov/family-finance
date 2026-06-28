package uz.familyfinance.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

/**
 * Autentifikatsiyalangan foydalanuvchi Telegram kirish PIN-kodini o'rnatadi yoki o'zgartiradi
 * (masalan PIN unutilib, username+parol bilan kirgandan keyin qayta o'rnatish).
 */
@Data
public class SetPinRequest {

    @NotBlank(message = "PIN-kod kiritilishi shart")
    @Pattern(regexp = "\\d{4,6}", message = "PIN 4-6 raqamdan iborat bo'lishi kerak")
    private String pin;
}
