package uz.familyfinance.api.dto.response;

import lombok.Data;
import uz.familyfinance.api.enums.AccountType;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

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
    private String accCode;
    private String accCodeFormatted;
    private String balanceAccountCode;
    private String currencyCode;
    private Long ownerId;
    private String ownerName;
    private String description;
    private String status;
    private String scope;
    private String myAccessRole;
    private BigDecimal openingBalance;
    private Long bankId;
    private String bankName;
    private String bankMfo;
    private String bankInn;
    private String bankLogoUrl;
    private List<CardResponse> cards;
    private List<AccountAccessResponse> accessList;
}
