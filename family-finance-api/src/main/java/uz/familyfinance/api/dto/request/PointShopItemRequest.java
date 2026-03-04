package uz.familyfinance.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

@Data
public class PointShopItemRequest {

    @NotBlank
    private String name;

    private String description;

    @NotNull
    @Positive
    private Integer price;

    private String icon;
    private String color;
    private Integer stock;
}
