package uz.familyfinance.api.dto.response;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class PointInvestmentResponse {

    private Long id;
    private Long participantId;
    private String participantName;
    private String type;
    private Integer investedAmount;
    private Integer currentValue;
    private BigDecimal returnRate;
    private Double profitPercentage;
    private LocalDateTime investedAt;
    private LocalDate maturityDate;
    private Boolean isActive;
}
