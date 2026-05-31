package uz.familyfinance.api.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import uz.familyfinance.api.enums.MarriageType;

import java.time.LocalDate;

/**
 * Shaxsga ota-ona qo'shish — ota, ona, nikoh va farzand bog'lanishi ATOMIK yaratiladi.
 * Ota/ona mavjud ({@code fatherId}/{@code motherId}) yoki yangi ({@code fatherFirstName}/
 * {@code motherFirstName}) bo'lishi mumkin.
 */
@Data
public class AddParentsRequest {

    @NotNull
    private Long childPersonId;

    // Ota — mavjud yoki yangi
    private Long fatherId;
    private String fatherFirstName;
    private LocalDate fatherBirthDate;

    // Ona — mavjud yoki yangi
    private Long motherId;
    private String motherFirstName;
    private LocalDate motherBirthDate;

    // Nikoh
    private MarriageType marriageType;
    private LocalDate marriageDate;
}
