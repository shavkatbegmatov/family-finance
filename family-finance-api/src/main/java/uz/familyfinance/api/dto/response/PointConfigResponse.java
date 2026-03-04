package uz.familyfinance.api.dto.response;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class PointConfigResponse {

    private Long id;
    private Long familyGroupId;
    private BigDecimal conversionRate;
    private String currency;
    private Boolean inflationEnabled;
    private BigDecimal inflationRateMonthly;
    private BigDecimal savingsInterestRate;
    private Boolean streakBonusEnabled;
    private BigDecimal streakBonusPercentage;
    private Integer maxDailyPoints;
    private Integer autoApproveBelow;
    private Boolean isActive;
    private LocalDateTime createdAt;
}
