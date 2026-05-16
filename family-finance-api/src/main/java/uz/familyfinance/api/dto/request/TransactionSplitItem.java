package uz.familyfinance.api.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class TransactionSplitItem {

    @NotNull(message = "Kategoriya ID si kerak")
    private Long categoryId;

    @NotNull(message = "Summa kerak")
    @Positive(message = "Summa musbat bo'lishi kerak")
    private BigDecimal amount;

    @Size(max = 500)
    private String note;
}
