package uz.familyfinance.api.dto.response;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class SavingsGoalResponse {
    private Long id;
    private String name;
    private BigDecimal targetAmount;
    private BigDecimal currentAmount;
    private Double percentage;
    private LocalDate deadline;
    private Long accountId;
    private String accountName;
    private String icon;
    private String color;
    private Boolean isCompleted;
    private LocalDateTime createdAt;
}
