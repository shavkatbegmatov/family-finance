package uz.familyfinance.api.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import uz.familyfinance.api.enums.AccountAccessRole;

@Data
public class AccountAccessRequest {
    @NotNull(message = "Foydalanuvchi ID si ko'rsatilishi shart")
    private Long userId;

    @NotNull(message = "Huquq turi ko'rsatilishi shart")
    private AccountAccessRole role;
}
