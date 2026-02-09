package uz.familyfinance.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class RelationshipTypeDto {
    private String value;
    private String label;
    private String category;
}
