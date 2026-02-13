package uz.familyfinance.api.dto.request;

import lombok.Data;
import uz.familyfinance.api.enums.FamilyUnitStatus;
import uz.familyfinance.api.enums.MarriageType;

import java.time.LocalDate;

@Data
public class UpdateFamilyUnitRequest {
    private MarriageType marriageType;
    private FamilyUnitStatus status;
    private LocalDate marriageDate;
    private LocalDate divorceDate;
}
