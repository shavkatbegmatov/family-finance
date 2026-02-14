package uz.familyfinance.api.dto.response;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class LabeledTreePersonDto extends FamilyTreeMemberDto {
    private String relationshipLabel;
}
