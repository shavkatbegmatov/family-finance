package uz.familyfinance.api.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import uz.familyfinance.api.enums.Gender;
import uz.familyfinance.api.enums.MarriageType;

import java.time.LocalDate;

/**
 * Shaxsga turmush o'rtoq qo'shish.
 *
 * <p>Agar shaxsda turmush o'rtoqsiz (yagona ota-ona) nikoh bo'lsa — turmush o'rtoq
 * O'SHA nikohga qo'shiladi (yangi nikoh yaratilmaydi). Aks holda yangi nikoh.
 * Hammasi ATOMIK (xato bo'lsa rollback).</p>
 */
@Data
public class AddSpouseRequest {

    @NotNull
    private Long personId;

    // Turmush o'rtoq — mavjud yoki yangi
    private Long spouseId;
    private String spouseFirstName;
    private String spouseLastName;
    private String spouseMiddleName;
    private Gender spouseGender;
    private LocalDate spouseBirthDate;

    private MarriageType marriageType;
    private LocalDate marriageDate;
}
