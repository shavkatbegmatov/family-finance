package uz.familyfinance.api.dto.response;

import lombok.Data;
import uz.familyfinance.api.enums.DebtStatus;
import uz.familyfinance.api.enums.DebtType;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class DebtResponse {
    private Long id;
    private DebtType type;
    private String personName;
    private String personPhone;
    private BigDecimal amount;
    private BigDecimal remainingAmount;
    private BigDecimal paidAmount;
    private Double paidPercentage;
    private LocalDate dueDate;
    private DebtStatus status;
    private String description;
    private Boolean isOverdue;
    private LocalDateTime createdAt;
}
