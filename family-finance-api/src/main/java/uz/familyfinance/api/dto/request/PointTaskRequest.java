package uz.familyfinance.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class PointTaskRequest {

    @NotBlank
    private String title;

    private String description;

    @NotNull
    private String category;

    @NotNull
    @Positive
    private Integer pointValue;

    private Integer penaltyValue;
    private Long assignedToId;
    private String recurrence;
    private LocalDateTime deadline;
    private String icon;
    private String color;
    private Long parentTaskId;
}
