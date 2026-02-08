package uz.familyfinance.api.dto.response;

import lombok.Data;
import uz.familyfinance.api.enums.AccountType;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class AccountResponse {
    private Long id;
    private String name;
    private AccountType type;
    private String currency;
    private BigDecimal balance;
    private String color;
    private String icon;
    private Boolean isActive;
    private LocalDateTime createdAt;
}
