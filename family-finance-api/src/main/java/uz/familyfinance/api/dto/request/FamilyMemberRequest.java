package uz.familyfinance.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import uz.familyfinance.api.enums.FamilyRole;
import uz.familyfinance.api.enums.Gender;
import uz.familyfinance.api.util.PasswordPolicy;
import java.time.LocalDate;

@Data
public class FamilyMemberRequest {
    @NotBlank @Size(max = 100) private String firstName;
    @Size(max = 100) private String lastName;
    @Size(max = 100) private String middleName;
    private FamilyRole role;
    private Gender gender;
    private LocalDate birthDate;
    @Size(max = 200) private String birthPlace;
    private LocalDate deathDate;
    @Size(max = 20, message = "Telefon raqami 20 ta belgidan oshmasligi kerak") private String phone;
    private String avatar;
    private Long userId;
    private Boolean createAccount;
    /** Qo'lda kiritilgan login. Bo'sh bo'lsa ism asosida avtomatik generatsiya qilinadi. */
    @Size(max = 30, message = "Login 30 belgidan oshmasligi kerak") private String accountUsername;
    @Size(min = PasswordPolicy.MIN_LENGTH, max = PasswordPolicy.MAX_LENGTH, message = "Parol {min}-{max} belgi orasida bo'lishi kerak") private String accountPassword;
    @Size(max = 20) private String accountRole;
}
