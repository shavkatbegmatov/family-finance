package uz.familyfinance.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import uz.familyfinance.api.enums.CategoryType;

@Data
public class CategoryRequest {
    @NotBlank private String name;
    @NotNull private CategoryType type;
    private Long parentId;
    private String icon;
    private String color;
}
