package uz.familyfinance.api.dto.familygroup;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FamilyGroupMemberDto {
    private Long id; // FamilyMember id
    private Long userId; // Tizimdagi User ID
    private String fullName;
    private String username;
    private String phone;
    private String role; // FamilyMember ro'li (otasi, onasi, etc)
}
