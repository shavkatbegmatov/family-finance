package uz.familyfinance.api.dto.response;

import lombok.Data;
import uz.familyfinance.api.enums.Gender;
import uz.familyfinance.api.enums.PartnerRole;

@Data
public class PartnerResponse {
    private Long id;
    private Long personId;
    private String fullName;
    /** Ism (alohida) — daraxtda ixcham "Familiya Ism" ko'rsatish uchun. */
    private String firstName;
    /** Familiya (alohida) — nullable. */
    private String lastName;
    private String avatar;
    private Gender gender;
    private PartnerRole role;
}
