package uz.familyfinance.api.dto.response;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class PointBalanceResponse {

    private Long id;
    private Long participantId;
    private String participantName;
    private String participantAvatar;
    private Integer currentBalance;
    private Integer totalEarned;
    private Integer totalSpent;
    private Integer totalPenalty;
    private Integer savingsBalance;
    private Integer investmentBalance;
    private Integer currentStreak;
    private Integer longestStreak;
    private LocalDateTime lastTaskCompletedAt;
    private BigDecimal inflationMultiplier;
    private BigDecimal realValue;
}
