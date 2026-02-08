package uz.familyfinance.api.dto.response;

import lombok.Data;
import uz.familyfinance.api.enums.FamilyRole;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class FamilyMemberResponse {
    private Long id;
    private String fullName;
    private FamilyRole role;
    private LocalDate birthDate;
    private String phone;
    private String avatar;
    private Boolean isActive;
    private Long userId;
    private String userName;
    private LocalDateTime createdAt;
}
