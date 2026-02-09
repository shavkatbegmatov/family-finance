package uz.familyfinance.api.dto.response;

import lombok.Data;

import java.util.List;

@Data
public class FamilyTreeResponse {
    private Long rootMemberId;
    private List<FamilyTreeMemberDto> members;
    private List<FamilyRelationshipDto> relationships;
}
