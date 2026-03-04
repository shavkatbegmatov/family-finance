package uz.familyfinance.api.dto.response;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class PointMultiplierEventResponse {

    private Long id;
    private String name;
    private String description;
    private BigDecimal multiplier;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private String taskCategory;
    private Boolean isActive;
    private String createdByName;
    private LocalDateTime createdAt;
}
