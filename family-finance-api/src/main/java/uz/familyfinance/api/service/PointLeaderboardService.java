package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.dto.response.LeaderboardEntryResponse;
import uz.familyfinance.api.entity.PointBalance;
import uz.familyfinance.api.repository.PointBalanceRepository;
import uz.familyfinance.api.repository.PointTaskRepository;
import uz.familyfinance.api.repository.PointTransactionRepository;

import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class PointLeaderboardService {

    private final PointBalanceRepository balanceRepository;
    private final PointTransactionRepository transactionRepository;
    private final PointTaskRepository taskRepository;
    private final PointConfigService configService;

    @Transactional(readOnly = true)
    public List<LeaderboardEntryResponse> getOverallLeaderboard() {
        Long groupId = configService.getCurrentFamilyGroupId();
        List<PointBalance> balances = balanceRepository.findByFamilyGroupIdOrderByTotalEarnedDesc(groupId);
        return buildLeaderboard(balances);
    }

    @Transactional(readOnly = true)
    public List<LeaderboardEntryResponse> getWeeklyLeaderboard() {
        Long groupId = configService.getCurrentFamilyGroupId();
        List<PointBalance> balances = balanceRepository.findByFamilyGroupIdOrderByCurrentBalanceDesc(groupId);

        LocalDateTime weekStart = LocalDateTime.now().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
                .withHour(0).withMinute(0).withSecond(0);
        LocalDateTime weekEnd = LocalDateTime.now();

        List<LeaderboardEntryResponse> entries = new ArrayList<>();
        int rank = 1;
        for (PointBalance b : balances) {
            Integer weeklyEarned = transactionRepository.sumEarnedBetween(
                    b.getParticipant().getId(), weekStart, weekEnd);
            LeaderboardEntryResponse entry = new LeaderboardEntryResponse();
            entry.setRank(rank++);
            entry.setParticipantId(b.getParticipant().getId());
            entry.setParticipantName(b.getParticipant().getDisplayName());
            entry.setParticipantAvatar(b.getParticipant().getAvatar());
            entry.setTotalPoints(weeklyEarned != null ? weeklyEarned : 0);
            entry.setCurrentBalance(b.getCurrentBalance());
            entry.setCurrentStreak(b.getCurrentStreak());
            entry.setTasksCompleted((int) taskRepository.countVerifiedByParticipant(b.getParticipant().getId()));
            entries.add(entry);
        }
        entries.sort((a, b) -> Integer.compare(b.getTotalPoints(), a.getTotalPoints()));
        for (int i = 0; i < entries.size(); i++) {
            entries.get(i).setRank(i + 1);
        }
        return entries;
    }

    @Transactional(readOnly = true)
    public List<LeaderboardEntryResponse> getMonthlyLeaderboard() {
        Long groupId = configService.getCurrentFamilyGroupId();
        List<PointBalance> balances = balanceRepository.findByFamilyGroupIdOrderByCurrentBalanceDesc(groupId);

        LocalDateTime monthStart = LocalDateTime.now().withDayOfMonth(1)
                .withHour(0).withMinute(0).withSecond(0);
        LocalDateTime monthEnd = LocalDateTime.now();

        List<LeaderboardEntryResponse> entries = new ArrayList<>();
        for (PointBalance b : balances) {
            Integer monthlyEarned = transactionRepository.sumEarnedBetween(
                    b.getParticipant().getId(), monthStart, monthEnd);
            LeaderboardEntryResponse entry = new LeaderboardEntryResponse();
            entry.setParticipantId(b.getParticipant().getId());
            entry.setParticipantName(b.getParticipant().getDisplayName());
            entry.setParticipantAvatar(b.getParticipant().getAvatar());
            entry.setTotalPoints(monthlyEarned != null ? monthlyEarned : 0);
            entry.setCurrentBalance(b.getCurrentBalance());
            entry.setCurrentStreak(b.getCurrentStreak());
            entry.setTasksCompleted((int) taskRepository.countVerifiedByParticipant(b.getParticipant().getId()));
            entries.add(entry);
        }
        entries.sort((a, b) -> Integer.compare(b.getTotalPoints(), a.getTotalPoints()));
        for (int i = 0; i < entries.size(); i++) {
            entries.get(i).setRank(i + 1);
        }
        return entries;
    }

    private List<LeaderboardEntryResponse> buildLeaderboard(List<PointBalance> balances) {
        List<LeaderboardEntryResponse> entries = new ArrayList<>();
        int rank = 1;
        for (PointBalance b : balances) {
            LeaderboardEntryResponse entry = new LeaderboardEntryResponse();
            entry.setRank(rank++);
            entry.setParticipantId(b.getParticipant().getId());
            entry.setParticipantName(b.getParticipant().getDisplayName());
            entry.setParticipantAvatar(b.getParticipant().getAvatar());
            entry.setTotalPoints(b.getTotalEarned());
            entry.setCurrentBalance(b.getCurrentBalance());
            entry.setCurrentStreak(b.getCurrentStreak());
            entry.setTasksCompleted((int) taskRepository.countVerifiedByParticipant(b.getParticipant().getId()));
            entries.add(entry);
        }
        return entries;
    }
}
