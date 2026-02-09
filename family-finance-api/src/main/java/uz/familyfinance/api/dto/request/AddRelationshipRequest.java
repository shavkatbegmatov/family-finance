package uz.familyfinance.api.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import uz.familyfinance.api.enums.RelationshipType;

@Data
public class AddRelationshipRequest {
    @NotNull private Long fromMemberId;
    @NotNull private Long toMemberId;
    @NotNull private RelationshipType relationshipType;
}
