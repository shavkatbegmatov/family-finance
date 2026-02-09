package uz.familyfinance.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import uz.familyfinance.api.enums.FamilyRole;
import uz.familyfinance.api.enums.Gender;
import uz.familyfinance.api.enums.RelationshipType;

import java.time.LocalDate;

@Data
public class AddFamilyMemberWithRelationRequest {
    @NotNull private Long fromMemberId;
    @NotNull private RelationshipType relationshipType;
    @NotBlank private String fullName;
    @NotNull private FamilyRole role;
    private Gender gender;
    private LocalDate birthDate;
    private String phone;
    private String avatar;
    private Boolean createAccount;
}
