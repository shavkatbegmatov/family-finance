package uz.familyfinance.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;
import uz.familyfinance.api.enums.FamilyRole;
import uz.familyfinance.api.enums.Gender;
import java.time.LocalDate;

@Data
public class FamilyMemberRequest {
    @NotBlank @Size(max = 100) private String fullName;
    @Size(max = 100) private String lastName;
    @NotNull private FamilyRole role;
    private Gender gender;
    private LocalDate birthDate;
    @Size(max = 200) private String birthPlace;
    private LocalDate deathDate;
    @Size(max = 20, message = "Telefon raqami 20 ta belgidan oshmasligi kerak") private String phone;
    private String avatar;
    private Long userId;
    private Boolean createAccount;
}
