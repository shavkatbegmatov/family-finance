package uz.familyfinance.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDate;

@Data
public class PointParticipantRequest {

    @NotBlank
    private String firstName;

    private String lastName;
    private String nickname;
    private LocalDate birthDate;
    private String avatar;
    private Long familyMemberId;
}
