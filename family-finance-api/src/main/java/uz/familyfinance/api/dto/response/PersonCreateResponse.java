package uz.familyfinance.api.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.familyfinance.api.enums.PersonType;

/**
 * "Yangi shaxs qo'shish" wizard javobi.
 *
 * <p>Tanlangan turga qarab har xil entity'lar yaratiladi va ularning ID lari javobda qaytariladi.
 * Faqat User yaratilgan hollarda {@code credentials} ham qaytariladi (ko'rsatish uchun).</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class PersonCreateResponse {

    private PersonType personType;

    /** Hamisha to'ladi — barcha turlarda FamilyMember yaratiladi. */
    private Long familyMemberId;

    private String displayName;

    /** Faqat ADULT_ACTIVE va ADMIN_ONLY uchun. */
    private Long userId;

    /** Login ma'lumotlari — yangi User yaratilgan bo'lsa, foydalanuvchiga bir marta ko'rsatiladi. */
    private CredentialsInfo credentials;

    /** Faqat CHILD va ADULT_ACTIVE uchun. */
    private Long participantId;

    private String message;
}
