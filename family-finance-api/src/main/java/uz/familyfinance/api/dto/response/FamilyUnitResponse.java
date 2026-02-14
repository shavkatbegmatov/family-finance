package uz.familyfinance.api.dto.response;

import lombok.Data;
import uz.familyfinance.api.enums.FamilyUnitStatus;
import uz.familyfinance.api.enums.MarriageType;

import java.time.LocalDate;
import java.util.List;

@Data
public class FamilyUnitResponse {
    private Long id;
    private MarriageType marriageType;
    private FamilyUnitStatus status;
    private LocalDate marriageDate;
    private LocalDate divorceDate;
    private List<PartnerResponse> partners;
    private List<ChildResponse> children;
}
