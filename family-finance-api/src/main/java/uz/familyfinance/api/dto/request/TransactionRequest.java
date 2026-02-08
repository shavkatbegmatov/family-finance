package uz.familyfinance.api.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;
import uz.familyfinance.api.enums.RecurringPattern;
import uz.familyfinance.api.enums.TransactionType;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class TransactionRequest {
    @NotNull private TransactionType type;
    @NotNull @Positive private BigDecimal amount;
    @NotNull private Long accountId;
    private Long toAccountId;
    private Long categoryId;
    private Long familyMemberId;
    @NotNull private LocalDateTime transactionDate;
    private String description;
    private Boolean isRecurring = false;
    private RecurringPattern recurringPattern;
    private String tags;
}
