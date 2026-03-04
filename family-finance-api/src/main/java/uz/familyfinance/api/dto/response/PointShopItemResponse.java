package uz.familyfinance.api.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class PointShopItemResponse {

    private Long id;
    private String name;
    private String description;
    private Integer price;
    private String icon;
    private String color;
    private Integer stock;
    private Boolean isActive;
    private LocalDateTime createdAt;
}
