package uz.familyfinance.api.dto.response;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class PointSavingsAccountResponse {

    private Long id;
    private Long participantId;
    private String participantName;
    private Integer balance;
    private BigDecimal interestRate;
    private LocalDateTime lastInterestAppliedAt;
    private Integer totalInterestEarned;
}
