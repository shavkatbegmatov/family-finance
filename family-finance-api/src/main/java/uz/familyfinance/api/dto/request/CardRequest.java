package uz.familyfinance.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;
import uz.familyfinance.api.enums.CardType;

@Data
public class CardRequest {
    @NotNull(message = "Karta turi ko'rsatilishi shart")
    private CardType cardType;

    @NotBlank(message = "Karta raqami bo'sh bo'lishi mumkin emas")
    @Pattern(regexp = "\\d{16}", message = "Karta raqami 16 ta raqamdan iborat bo'lishi kerak")
    private String cardNumber;

    private String cardHolderName;

    @Pattern(regexp = "(0[1-9]|1[0-2])/\\d{2}", message = "Amal qilish muddati MM/YY formatida bo'lishi kerak")
    private String expiryDate;
}
