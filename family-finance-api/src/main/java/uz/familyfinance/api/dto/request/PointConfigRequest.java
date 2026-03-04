package uz.familyfinance.api.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class PointConfigRequest {

    @NotNull
    @Positive
    private BigDecimal conversionRate;

    private String currency;
    private Boolean inflationEnabled;
    private BigDecimal inflationRateMonthly;
    private BigDecimal savingsInterestRate;
    private Boolean streakBonusEnabled;
    private BigDecimal streakBonusPercentage;
    private Integer maxDailyPoints;
    private Integer autoApproveBelow;
}
