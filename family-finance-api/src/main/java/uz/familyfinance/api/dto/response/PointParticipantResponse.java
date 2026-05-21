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
    /** Bog'langan oila a'zosining User ID si (login bor-yo'qligini bildirish uchun). */
    private Long familyMemberUserId;
    /** Bog'langan oila a'zosining username'i (tooltip uchun). */
    private String familyMemberUsername;
    private Boolean isActive;
    private LocalDateTime createdAt;
}
