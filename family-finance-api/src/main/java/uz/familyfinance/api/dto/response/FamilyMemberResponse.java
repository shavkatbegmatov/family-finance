package uz.familyfinance.api.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;
import uz.familyfinance.api.enums.FamilyRole;
import uz.familyfinance.api.enums.Gender;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class FamilyMemberResponse {
    private Long id;
    private String firstName;
    private String lastName;
    private String middleName;
    private String fullName;
    private FamilyRole role;
    private Gender gender;
    private LocalDate birthDate;
    private String birthPlace;
    private LocalDate deathDate;
    private String phone;
    private String avatar;
    private Boolean isActive;
    private Long userId;
    private String userName;
    private LocalDateTime createdAt;

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private CredentialsInfo credentials;
}
