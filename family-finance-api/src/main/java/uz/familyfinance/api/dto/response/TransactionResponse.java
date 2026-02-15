package uz.familyfinance.api.dto.response;

import lombok.Data;
import uz.familyfinance.api.enums.RecurringPattern;
import uz.familyfinance.api.enums.TransactionType;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class TransactionResponse {
    private Long id;
    private TransactionType type;
    private BigDecimal amount;
    private Long accountId;
    private String accountName;
    private Long toAccountId;
    private String toAccountName;
    private Long categoryId;
    private String categoryName;
    private Long familyMemberId;
    private String familyMemberName;
    private LocalDateTime transactionDate;
    private String description;
    private Boolean isRecurring;
    private RecurringPattern recurringPattern;
    private String tags;
    private LocalDateTime createdAt;
    private Long debitAccountId;
    private String debitAccountName;
    private String debitAccCode;
    private Long creditAccountId;
    private String creditAccountName;
    private String creditAccCode;
    private String status;
    private BigDecimal balanceBeforeDebit;
    private BigDecimal balanceAfterDebit;
    private BigDecimal balanceBeforeCredit;
    private BigDecimal balanceAfterCredit;
    private Long originalTransactionId;
}
