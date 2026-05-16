package uz.familyfinance.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransactionSplitResponse {
    private Long id;
    private Long categoryId;
    private String categoryName;
    private BigDecimal amount;
    private String note;
}
