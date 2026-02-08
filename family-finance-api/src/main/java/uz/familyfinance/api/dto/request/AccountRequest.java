package uz.familyfinance.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import uz.familyfinance.api.enums.AccountType;
import java.math.BigDecimal;

@Data
public class AccountRequest {
    @NotBlank private String name;
    @NotNull private AccountType type;
    private String currency = "UZS";
    private BigDecimal balance;
    private String color;
    private String icon;
}
