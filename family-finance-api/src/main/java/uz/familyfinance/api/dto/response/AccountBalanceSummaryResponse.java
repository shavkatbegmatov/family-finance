package uz.familyfinance.api.dto.response;

import lombok.Builder;
import lombok.Data;
import uz.familyfinance.api.enums.AccountType;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
public class AccountBalanceSummaryResponse {
    private Long accountId;
    private String accCode;
    private String accountName;
    private AccountType accountType;
    private BigDecimal openingBalance;
    private BigDecimal debitTurnover;
    private BigDecimal creditTurnover;
    private BigDecimal closingBalance;
    private LocalDate periodStart;
    private LocalDate periodEnd;
}
