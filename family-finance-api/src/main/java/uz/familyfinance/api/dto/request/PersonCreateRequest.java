package uz.familyfinance.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;
import uz.familyfinance.api.enums.FamilyRole;
import uz.familyfinance.api.enums.Gender;
import uz.familyfinance.api.enums.PersonType;

import java.time.LocalDate;

/**
 * "Yangi shaxs qo'shish" wizard so'rovi.
 *
 * <p>{@code personType} qiymatiga qarab tegishli maydonlar ishlatiladi.
 * Shartli maydonlar PersonService da tekshiriladi (xato bo'lsa IllegalArgumentException).</p>
 *
 * <ul>
 *   <li><b>CHILD / ADULT_ACTIVE</b> — {@code nickname} ixtiyoriy</li>
 *   <li><b>ADULT_ACTIVE / ADMIN_ONLY</b> — {@code password} va {@code accountRole} ixtiyoriy
 *       (avto-generatsiya/default "MEMBER")</li>
 * </ul>
 */
@Data
public class PersonCreateRequest {

    @NotNull(message = "Shaxs turi tanlanishi shart")
    private PersonType personType;

    @NotBlank(message = "Ism kiritilishi shart")
    @Size(min = 1, max = 100, message = "Ism 1-100 belgi orasida bo'lishi kerak")
    private String firstName;

    @Size(max = 100, message = "Familiya 100 belgidan oshmasligi kerak")
    private String lastName;

    @Size(max = 100, message = "Otasining ismi 100 belgidan oshmasligi kerak")
    private String middleName;

    /** Ixtiyoriy — null bo'lsa tur asosida default tanlanadi (CHILD -> CHILD, qolganlari -> OTHER). */
    private FamilyRole familyRole;

    private Gender gender;

    private LocalDate birthDate;

    @Size(max = 200, message = "Tug'ilgan joy 200 belgidan oshmasligi kerak")
    private String birthPlace;

    @Size(max = 20, message = "Telefon raqami 20 belgidan oshmasligi kerak")
    private String phone;

    // ===== Ball tizimi maydoni (CHILD / ADULT_ACTIVE uchun) =====

    @Size(max = 50, message = "Laqab 50 belgidan oshmasligi kerak")
    private String nickname;

    // ===== Login maydonlari (ADULT_ACTIVE / ADMIN_ONLY uchun) =====

    /** Qo'lda kiritilgan login. Bo'sh bo'lsa ism asosida avtomatik generatsiya qilinadi. */
    @Size(max = 30, message = "Login 30 belgidan oshmasligi kerak")
    private String username;

    @Size(min = 6, max = 100, message = "Parol 6-100 belgi orasida bo'lishi kerak")
    private String password;

    @Size(max = 50, message = "Rol kodi 50 belgidan oshmasligi kerak")
    private String accountRole;
}
