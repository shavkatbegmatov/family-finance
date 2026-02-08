package uz.familyfinance.api.dto.response;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class SavingsContributionResponse {
    private Long id;
    private Long savingsGoalId;
    private String savingsGoalName;
    private BigDecimal amount;
    private LocalDate contributionDate;
    private String note;
    private LocalDateTime createdAt;
}
