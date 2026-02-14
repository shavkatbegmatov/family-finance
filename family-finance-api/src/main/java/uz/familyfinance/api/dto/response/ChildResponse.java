package uz.familyfinance.api.dto.response;

import lombok.Data;
import uz.familyfinance.api.enums.Gender;
import uz.familyfinance.api.enums.LineageType;

@Data
public class ChildResponse {
    private Long id;
    private Long personId;
    private String fullName;
    private String avatar;
    private Gender gender;
    private LineageType lineageType;
    private Integer birthOrder;
}
