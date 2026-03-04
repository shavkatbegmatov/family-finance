package uz.familyfinance.api.dto.response;

import lombok.Data;

import java.util.List;

@Data
public class PointWeeklyReportResponse {

    private Long participantId;
    private String participantName;
    private Integer pointsEarned;
    private Integer pointsSpent;
    private Integer tasksCompleted;
    private Integer tasksFailed;
    private Integer currentStreak;
    private Integer rankChange;
    private List<String> achievementsEarned;
}
