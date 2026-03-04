package uz.familyfinance.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

@Data
public class PointAchievementRequest {

    @NotBlank
    private String name;

    private String description;

    @NotNull
    private String type;

    private String icon;
    private String color;

    @NotNull
    @Positive
    private Integer requiredValue;

    private Integer bonusPoints;
}
