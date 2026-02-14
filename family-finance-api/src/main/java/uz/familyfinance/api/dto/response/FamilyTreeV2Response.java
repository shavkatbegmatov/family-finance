package uz.familyfinance.api.dto.response;

import lombok.Data;

import java.util.List;

@Data
public class FamilyTreeV2Response {
    private Long rootPersonId;
    private List<FamilyTreeMemberDto> persons;
    private List<FamilyUnitResponse> familyUnits;
}
