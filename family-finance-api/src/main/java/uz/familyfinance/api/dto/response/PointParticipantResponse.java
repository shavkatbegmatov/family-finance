package uz.familyfinance.api.dto.response;

import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class PointParticipantResponse {

    private Long id;
    private Long familyGroupId;
    private String firstName;
    private String lastName;
    private String nickname;
    private String displayName;
    private LocalDate birthDate;
    private String avatar;
    private Long familyMemberId;
    private String familyMemberName;
    private Boolean isActive;
    private LocalDateTime createdAt;
}
