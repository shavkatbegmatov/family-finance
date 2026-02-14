package uz.familyfinance.api.dto.response;

import lombok.Data;
import uz.familyfinance.api.enums.FamilyRole;
import uz.familyfinance.api.enums.Gender;

import java.time.LocalDate;

@Data
public class FamilyTreeMemberDto {
    private Long id;
    private String fullName;
    private String lastName;
    private FamilyRole role;
    private Gender gender;
    private LocalDate birthDate;
    private String birthPlace;
    private LocalDate deathDate;
    private String phone;
    private String avatar;
    private Boolean isActive;
    private Long userId;
}
