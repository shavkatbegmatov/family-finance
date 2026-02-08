package uz.familyfinance.api.dto.response;

import lombok.Data;
import uz.familyfinance.api.enums.CategoryType;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class CategoryResponse {
    private Long id;
    private String name;
    private CategoryType type;
    private Long parentId;
    private String parentName;
    private String icon;
    private String color;
    private Boolean isSystem;
    private Boolean isActive;
    private List<CategoryResponse> children;
    private LocalDateTime createdAt;
}
