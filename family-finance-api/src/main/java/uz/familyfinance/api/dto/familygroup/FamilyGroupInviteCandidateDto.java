package uz.familyfinance.api.dto.familygroup;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FamilyGroupInviteCandidateDto {
    private Long userId;
    private Long familyMemberId;
    private String username;
    private String fullName;
    private String email;
    private String phone;
    private Boolean active;

    private Long familyGroupId;
    private String familyGroupName;
    private Boolean alreadyInCurrentGroup;

    private Long linkedFamilyMemberId;
    private String linkedFamilyMemberName;
    private String linkedFamilyRole;
    private String linkedFamilyGender;
    private LocalDate linkedFamilyBirthDate;
    private String linkedFamilyBirthPlace;
    private String linkedFamilyPhone;
    private Boolean linkedFamilyMemberActive;
}
