package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.dto.response.PointWeeklyReportResponse;
import uz.familyfinance.api.entity.PointBalance;
import uz.familyfinance.api.entity.PointMemberAchievement;
import uz.familyfinance.api.enums.PointTaskStatus;
import uz.familyfinance.api.repository.*;

import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PointReportService {

    private final PointBalanceRepository balanceRepository;
    private final PointTransactionRepository transactionRepository;
    private final PointTaskRepository taskRepository;
    private final PointMemberAchievementRepository memberAchievementRepository;
    private final PointConfigService configService;

    @Transactional(readOnly = true)
    public PointWeeklyReportResponse getWeeklyReport(Long participantId) {
        LocalDateTime weekStart = LocalDateTime.now()
                .with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
                .withHour(0).withMinute(0).withSecond(0);
        LocalDateTime weekEnd = LocalDateTime.now();

        PointBalance balance = balanceRepository.findByParticipantId(participantId).orElse(null);
        if (balance == null) return null;

        Integer earned = transactionRepository.sumEarnedBetween(participantId, weekStart, weekEnd);

        PointWeeklyReportResponse r = new PointWeeklyReportResponse();
        r.setParticipantId(participantId);
        r.setParticipantName(balance.getParticipant().getDisplayName());
        r.setPointsEarned(earned != null ? earned : 0);
        r.setPointsSpent(0);
        r.setTasksCompleted((int) taskRepository.countVerifiedByParticipant(participantId));
        r.setTasksFailed(0);
        r.setCurrentStreak(balance.getCurrentStreak());
        r.setRankChange(0);

        List<PointMemberAchievement> recentAchievements = memberAchievementRepository.findByParticipantId(participantId)
                .stream()
                .filter(ma -> ma.getEarnedAt().isAfter(weekStart))
                .collect(Collectors.toList());
        r.setAchievementsEarned(recentAchievements.stream()
                .map(ma -> ma.getAchievement().getName())
                .collect(Collectors.toList()));

        return r;
    }

    @Transactional(readOnly = true)
    public List<PointWeeklyReportResponse> getSummary() {
        Long groupId = configService.getCurrentFamilyGroupId();
        List<PointBalance> balances = balanceRepository.findByFamilyGroupIdOrderByTotalEarnedDesc(groupId);
        List<PointWeeklyReportResponse> reports = new ArrayList<>();
        for (PointBalance b : balances) {
            PointWeeklyReportResponse report = getWeeklyReport(b.getParticipant().getId());
            if (report != null) reports.add(report);
        }
        return reports;
    }
}
