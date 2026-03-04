package uz.familyfinance.api.dto.response;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class PointConversionResponse {

    private Long id;
    private Long participantId;
    private String participantName;
    private Integer pointsConverted;
    private BigDecimal conversionRate;
    private BigDecimal moneyAmount;
    private String currency;
    private Long targetAccountId;
    private String targetAccountName;
    private String approvedByName;
    private LocalDateTime conversionDate;
}
