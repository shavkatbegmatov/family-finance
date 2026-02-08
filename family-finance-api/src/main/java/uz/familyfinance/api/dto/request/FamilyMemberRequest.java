package uz.familyfinance.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import uz.familyfinance.api.enums.FamilyRole;
import java.time.LocalDate;

@Data
public class FamilyMemberRequest {
    @NotBlank private String fullName;
    @NotNull private FamilyRole role;
    private LocalDate birthDate;
    private String phone;
    private String avatar;
    private Long userId;
    private Boolean createAccount;
}
