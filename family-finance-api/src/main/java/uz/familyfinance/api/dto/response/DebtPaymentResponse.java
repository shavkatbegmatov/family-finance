package uz.familyfinance.api.dto.response;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class DebtPaymentResponse {
    private Long id;
    private Long debtId;
    private String debtPersonName;
    private BigDecimal amount;
    private LocalDate paymentDate;
    private String note;
    private LocalDateTime createdAt;
}
