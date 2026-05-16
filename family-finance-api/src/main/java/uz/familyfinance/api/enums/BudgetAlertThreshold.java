package uz.familyfinance.api.enums;

import java.math.BigDecimal;

public enum BudgetAlertThreshold {
    WARNING(80),
    EXCEEDED(100);

    private final int percent;

    BudgetAlertThreshold(int percent) {
        this.percent = percent;
    }

    public int getPercent() {
        return percent;
    }

    public BigDecimal getPercentBigDecimal() {
        return BigDecimal.valueOf(percent);
    }
}
