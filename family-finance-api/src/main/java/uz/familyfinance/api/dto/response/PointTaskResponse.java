package uz.familyfinance.api.dto.response;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class PointTaskResponse {

    private Long id;
    private Long familyGroupId;
    private String title;
    private String description;
    private String category;
    private Integer pointValue;
    private Integer penaltyValue;
    private Long assignedToId;
    private String assignedToName;
    private String assignedByName;
    private String status;
    private String recurrence;
    private LocalDateTime deadline;
    private LocalDateTime completedAt;
    private String verifiedByName;
    private String rejectionReason;
    private String icon;
    private String color;
    private Long parentTaskId;
    private BigDecimal multiplier;
    private Integer effectivePoints;
    private LocalDateTime createdAt;
}
