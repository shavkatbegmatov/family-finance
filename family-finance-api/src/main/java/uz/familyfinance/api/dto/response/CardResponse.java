package uz.familyfinance.api.dto.response;

import lombok.Data;
import uz.familyfinance.api.enums.CardType;
import java.time.LocalDateTime;

@Data
public class CardResponse {
    private Long id;
    private Long accountId;
    private CardType cardType;
    private String cardBin;
    private String cardLastFour;
    private String maskedNumber;
    private String cardHolderName;
    private String expiryDate;
    private Boolean isActive;
    private LocalDateTime createdAt;
}
