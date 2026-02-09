package uz.familyfinance.api.dto.response;

import lombok.Data;
import uz.familyfinance.api.enums.RelationshipType;

@Data
public class FamilyRelationshipDto {
    private Long id;
    private Long fromMemberId;
    private Long toMemberId;
    private RelationshipType relationshipType;
    private String label;
    private String category;
}
