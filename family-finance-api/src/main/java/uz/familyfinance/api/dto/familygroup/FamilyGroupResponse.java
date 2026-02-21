package uz.familyfinance.api.dto.familygroup;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FamilyGroupResponse {
    private Long id;
    private String name;
    private Long adminId;
    private Boolean active;
    private List<FamilyGroupMemberDto> members;
}
