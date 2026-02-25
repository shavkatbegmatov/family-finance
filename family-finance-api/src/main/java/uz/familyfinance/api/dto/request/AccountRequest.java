package uz.familyfinance.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Data;
import uz.familyfinance.api.enums.AccountScope;
import uz.familyfinance.api.enums.AccountType;
import java.math.BigDecimal;

@Data
public class AccountRequest {
    @NotBlank
    private String name;
    @NotNull
    private AccountType type;
    private AccountScope scope;
    private String currency = "UZS";
    @PositiveOrZero(message = "Boshlang'ich balans manfiy bo'lishi mumkin emas")
    private BigDecimal balance;
    private String color;
    private String icon;
    private Long ownerId;
    private String currencyCode;
    private String description;

    @PositiveOrZero
    private BigDecimal openingBalance;
    private Long bankId;
    private String bankName;
    private String bankMfo;
    private String bankInn;

    private String cardNumber;
    private String cardHolderName;
    private String cardExpiryDate;
    private String cardType;
    private Boolean isVirtual;
}
