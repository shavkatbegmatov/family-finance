package uz.familyfinance.api.dto.familygroup;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FamilyGroupAddMemberRequest {
    @NotBlank(message = "Foydalanuvchi logini (username) kiritilishi shart")
    private String username;
}
