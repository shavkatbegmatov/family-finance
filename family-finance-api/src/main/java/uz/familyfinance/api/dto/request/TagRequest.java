package uz.familyfinance.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class TagRequest {

    @NotBlank(message = "Tag nomi bo'sh bo'lmasligi kerak")
    @Size(min = 1, max = 50, message = "Tag nomi 1-50 belgi oralig'ida bo'lishi kerak")
    private String name;

    @Pattern(regexp = "^(#[0-9A-Fa-f]{6}|)?$", message = "Rang #RRGGBB formatida bo'lishi kerak")
    private String color;
}
