package uz.familyfinance.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RelationshipResult {
    private Long viewerId;
    private Long targetId;
    private String relationshipLabel;
    private String reverseLabel;
    private int stepsUp;
    private int stepsDown;
    private String side;
}
