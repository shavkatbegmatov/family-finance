package uz.familyfinance.api.dto.familygroup;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FamilyAddressHistoryDto {
    private Long id;
    private String address;
    private LocalDate moveInDate;
    private LocalDate moveOutDate;
    private Boolean isCurrent;
}
