package uz.familyfinance.api.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.entity.*;
import uz.familyfinance.api.enums.*;
import uz.familyfinance.api.repository.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Random;

@Component
@RequiredArgsConstructor
@Slf4j
public class PointScheduler {

    private final PointTaskRepository taskRepository;
    private final PointBalanceRepository balanceRepository;
    private final PointConfigRepository configRepository;
    private final PointSavingsAccountRepository savingsRepository;
    private final PointInvestmentRepository investmentRepository;
    private final PointInflationSnapshotRepository inflationSnapshotRepository;
    private final PointChallengeRepository challengeRepository;
    private final PointChallengeParticipantRepository challengeParticipantRepository;

    private final Random random = new Random();

    /**
     * Har kuni 00:00 - Muddati o'tgan vazifalarni EXPIRED qilish
     */
    @Scheduled(cron = "0 0 0 * * *")
    @Transactional
    public void expireTasks() {
        log.info("Muddati o'tgan vazifalarni tekshirish...");
        List<PointTask> expired = taskRepository.findExpiredTasks(LocalDateTime.now());
        for (PointTask task : expired) {
            task.setStatus(PointTaskStatus.EXPIRED);
            taskRepository.save(task);
        }
        if (!expired.isEmpty()) {
            log.info("{} ta vazifa EXPIRED qilindi", expired.size());
        }
    }

    /**
     * Har kuni 00:00 - Streak tekshirish
     */
    @Scheduled(cron = "0 1 0 * * *")
    @Transactional
    public void checkStreaks() {
        log.info("Streak tekshirish...");
        LocalDateTime yesterday = LocalDateTime.now().minusDays(1).withHour(0).withMinute(0);
        List<PointBalance> allBalances = balanceRepository.findAll();

        int resetCount = 0;
        for (PointBalance balance : allBalances) {
            if (balance.getCurrentStreak() > 0 && balance.getLastTaskCompletedAt() != null
                    && balance.getLastTaskCompletedAt().isBefore(yesterday)) {
                balanceRepository.resetStreak(balance.getId());
                resetCount++;
            }
        }
        if (resetCount > 0) {
            log.info("{} ta ishtirokchining streak'i reset qilindi", resetCount);
        }
    }

    /**
     * Har kuni 06:00 - Recurring vazifalar generatsiya
     */
    @Scheduled(cron = "0 0 6 * * *")
    @Transactional
    public void generateRecurringTasks() {
        log.info("Recurring vazifalar generatsiya...");
        List<PointConfig> configs = configRepository.findAll();

        for (PointConfig config : configs) {
            List<PointTask> templates = taskRepository.findRecurringTemplates(config.getFamilyGroup().getId());
            for (PointTask template : templates) {
                boolean shouldGenerate = false;
                switch (template.getRecurrence()) {
                    case DAILY -> shouldGenerate = true;
                    case WEEKLY -> shouldGenerate = LocalDate.now().getDayOfWeek().getValue() == 1;
                    case MONTHLY -> shouldGenerate = LocalDate.now().getDayOfMonth() == 1;
                    default -> {}
                }

                if (shouldGenerate) {
                    PointTask newTask = PointTask.builder()
                            .familyGroup(template.getFamilyGroup())
                            .title(template.getTitle())
                            .description(template.getDescription())
                            .category(template.getCategory())
                            .pointValue(template.getPointValue())
                            .penaltyValue(template.getPenaltyValue())
                            .assignedTo(template.getAssignedTo())
                            .assignedBy(template.getAssignedBy())
                            .status(template.getAssignedTo() != null ? PointTaskStatus.ASSIGNED : PointTaskStatus.DRAFT)
                            .recurrence(template.getRecurrence())
                            .icon(template.getIcon())
                            .color(template.getColor())
                            .parentTaskId(template.getId())
                            .build();
                    taskRepository.save(newTask);
                }
            }
        }
    }

    /**
     * Har dushanba 00:00 - Investitsiya qaytarishini hisoblash
     */
    @Scheduled(cron = "0 0 0 * * MON")
    @Transactional
    public void calculateInvestmentReturns() {
        log.info("Investitsiya qaytarishini hisoblash...");
        List<PointInvestment> investments = investmentRepository.findByIsActiveTrue();

        for (PointInvestment inv : investments) {
            double returnRate;
            switch (inv.getType()) {
                case STABLE -> returnRate = 0.01 + random.nextDouble() * 0.02; // 1-3%
                case MODERATE -> returnRate = -0.02 + random.nextDouble() * 0.07; // -2% to 5%
                case RISKY -> returnRate = -0.1 + random.nextDouble() * 0.2; // -10% to 10%
                default -> returnRate = 0;
            }

            int change = (int) Math.round(inv.getCurrentValue() * returnRate);
            inv.setCurrentValue(Math.max(0, inv.getCurrentValue() + change));
            inv.setReturnRate(BigDecimal.valueOf(returnRate).setScale(4, RoundingMode.HALF_UP));
            investmentRepository.save(inv);
        }
    }

    /**
     * Har oyning 1-kuni 00:00 - Inflyatsiya qo'llash
     */
    @Scheduled(cron = "0 0 0 1 * *")
    @Transactional
    public void applyInflation() {
        log.info("Inflyatsiya qo'llash...");
        List<PointConfig> configs = configRepository.findAll();

        for (PointConfig config : configs) {
            if (!config.getInflationEnabled() || config.getInflationRateMonthly() == null
                    || config.getInflationRateMonthly().compareTo(BigDecimal.ZERO) == 0) {
                continue;
            }

            BigDecimal factor = BigDecimal.ONE.subtract(config.getInflationRateMonthly());
            balanceRepository.applyInflation(config.getFamilyGroup().getId(), factor);

            // Snapshot saqlash
            PointInflationSnapshot snapshot = PointInflationSnapshot.builder()
                    .familyGroup(config.getFamilyGroup())
                    .snapshotDate(LocalDate.now())
                    .inflationRate(config.getInflationRateMonthly())
                    .cumulativeMultiplier(factor)
                    .build();
            inflationSnapshotRepository.save(snapshot);

            log.info("Inflyatsiya qo'llandi: {} guruh, rate: {}", config.getFamilyGroup().getName(), config.getInflationRateMonthly());
        }
    }

    /**
     * Har oyning 1-kuni 01:00 - Jamg'arma foizi hisoblash
     */
    @Scheduled(cron = "0 0 1 1 * *")
    @Transactional
    public void applySavingsInterest() {
        log.info("Jamg'arma foizi hisoblash...");
        List<PointSavingsAccount> accounts = savingsRepository.findAll();

        for (PointSavingsAccount sa : accounts) {
            if (sa.getBalance() > 0 && sa.getInterestRate() != null
                    && sa.getInterestRate().compareTo(BigDecimal.ZERO) > 0) {
                int interest = sa.getInterestRate().multiply(BigDecimal.valueOf(sa.getBalance()))
                        .setScale(0, RoundingMode.HALF_UP).intValue();
                if (interest > 0) {
                    sa.setBalance(sa.getBalance() + interest);
                    sa.setTotalInterestEarned(sa.getTotalInterestEarned() + interest);
                    sa.setLastInterestAppliedAt(LocalDateTime.now());
                    savingsRepository.save(sa);
                }
            }
        }
    }

    /**
     * Har kuni 00:00 - Tugagan musobaqalarni yakunlash
     */
    @Scheduled(cron = "0 2 0 * * *")
    @Transactional
    public void completeChallenges() {
        log.info("Tugagan musobaqalarni tekshirish...");
        List<PointChallenge> expired = challengeRepository.findByStatusAndEndDateBefore(
                PointChallengeStatus.ACTIVE, LocalDate.now());

        for (PointChallenge challenge : expired) {
            challenge.setStatus(PointChallengeStatus.COMPLETED);
            challengeRepository.save(challenge);

            List<PointChallengeParticipant> participants =
                    challengeParticipantRepository.findByChallengeIdOrderByScoreDesc(challenge.getId());
            for (int i = 0; i < participants.size(); i++) {
                PointChallengeParticipant cp = participants.get(i);
                cp.setRank(i + 1);
                challengeParticipantRepository.save(cp);
            }

            log.info("Musobaqa yakunlandi: {}", challenge.getTitle());
        }
    }
}
