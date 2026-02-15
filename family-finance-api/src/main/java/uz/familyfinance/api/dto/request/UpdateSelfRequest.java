package uz.familyfinance.api.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import uz.familyfinance.api.enums.Gender;
import java.time.LocalDate;

@Data
public class UpdateSelfRequest {
    // FamilyMember maydonlari
    @NotBlank @Size(max = 100) private String firstName;
    @Size(max = 100) private String lastName;
    @Size(max = 100) private String middleName;
    private Gender gender;
    @Size(max = 20, message = "Telefon raqami 20 ta belgidan oshmasligi kerak") private String phone;
    private LocalDate birthDate;
    @Size(max = 200) private String birthPlace;
    private String avatar;

    // User maydonlari
    @Email(message = "Email formati noto'g'ri")
    @Size(max = 100) private String email;
}
