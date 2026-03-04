package uz.familyfinance.api.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class PointPurchaseResponse {

    private Long id;
    private Long participantId;
    private String participantName;
    private Long shopItemId;
    private String shopItemName;
    private Integer pointsSpent;
    private LocalDateTime purchaseDate;
    private Boolean isDelivered;
    private LocalDateTime deliveredAt;
    private String deliveredByName;
}
