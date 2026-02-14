package uz.familyfinance.api.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import uz.familyfinance.api.enums.MarriageType;

import java.time.LocalDate;

@Data
public class CreateFamilyUnitRequest {
    @NotNull private Long partner1Id;
    private Long partner2Id;
    private MarriageType marriageType;
    private LocalDate marriageDate;
}
