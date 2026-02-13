package uz.familyfinance.api.dto.response;

import lombok.Data;
import uz.familyfinance.api.enums.Gender;
import uz.familyfinance.api.enums.PartnerRole;

@Data
public class PartnerResponse {
    private Long id;
    private Long personId;
    private String fullName;
    private String avatar;
    private Gender gender;
    private PartnerRole role;
}
