package uz.familyfinance.api.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Positive;
import lombok.Data;
import uz.familyfinance.api.enums.RecurringPattern;
import uz.familyfinance.api.enums.TransactionType;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

@Data
public class TransactionRequest {
    @NotNull private TransactionType type;
    @NotNull @Positive private BigDecimal amount;
    @NotNull private Long accountId;
    private Long toAccountId;
    private Long categoryId;
    private Long familyMemberId;
    @NotNull @PastOrPresent(message = "Tranzaksiya sanasi kelajakda bo'lishi mumkin emas") private LocalDateTime transactionDate;
    private String description;
    private Boolean isRecurring = false;
    private RecurringPattern recurringPattern;
    private String tags;
    private Set<Long> tagIds;

    /** Agar bo'sh emas bo'lsa, summalarining yig'indisi `amount` ga teng bo'lishi shart. */
    @Valid
    private List<TransactionSplitItem> splits;
}
