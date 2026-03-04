package uz.familyfinance.api.dto.response;

import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class PointChallengeResponse {

    private Long id;
    private String title;
    private String description;
    private LocalDate startDate;
    private LocalDate endDate;
    private Integer rewardPoints;
    private String status;
    private String taskCategory;
    private String createdByName;
    private List<ChallengeParticipantEntry> participants;
    private LocalDateTime createdAt;

    @Data
    public static class ChallengeParticipantEntry {
        private Long participantId;
        private String participantName;
        private Integer score;
        private Integer rank;
    }
}
