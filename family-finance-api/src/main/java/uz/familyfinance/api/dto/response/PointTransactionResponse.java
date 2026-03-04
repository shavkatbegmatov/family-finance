package uz.familyfinance.api.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class PointTransactionResponse {

    private Long id;
    private Long participantId;
    private String participantName;
    private String type;
    private Integer amount;
    private Integer balanceBefore;
    private Integer balanceAfter;
    private String description;
    private Long taskId;
    private String taskTitle;
    private String createdByName;
    private LocalDateTime transactionDate;
}
