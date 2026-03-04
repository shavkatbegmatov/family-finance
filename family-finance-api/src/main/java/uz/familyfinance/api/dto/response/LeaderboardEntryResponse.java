package uz.familyfinance.api.dto.response;

import lombok.Data;

@Data
public class LeaderboardEntryResponse {

    private Integer rank;
    private Long participantId;
    private String participantName;
    private String participantAvatar;
    private Integer totalPoints;
    private Integer currentBalance;
    private Integer currentStreak;
    private Integer tasksCompleted;
}
