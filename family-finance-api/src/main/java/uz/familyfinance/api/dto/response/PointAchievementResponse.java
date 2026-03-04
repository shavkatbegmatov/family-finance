package uz.familyfinance.api.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class PointAchievementResponse {

    private Long id;
    private String name;
    private String description;
    private String type;
    private String icon;
    private String color;
    private Integer requiredValue;
    private Integer bonusPoints;
    private Boolean isSystem;
    private Boolean isActive;
    private Boolean earned;
    private LocalDateTime earnedAt;
}
