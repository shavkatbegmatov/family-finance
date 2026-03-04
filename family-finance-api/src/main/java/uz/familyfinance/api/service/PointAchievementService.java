package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.dto.request.PointAchievementRequest;
import uz.familyfinance.api.dto.response.PointAchievementResponse;
import uz.familyfinance.api.entity.*;
import uz.familyfinance.api.enums.AchievementType;
import uz.familyfinance.api.enums.PointTransactionType;
import uz.familyfinance.api.exception.ResourceNotFoundException;
import uz.familyfinance.api.repository.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PointAchievementService {

    private final PointAchievementRepository achievementRepository;
    private final PointMemberAchievementRepository memberAchievementRepository;
    private final PointBalanceRepository balanceRepository;
    private final PointTaskRepository taskRepository;
    private final PointTransactionService transactionService;
    private final PointConfigService configService;

    @Transactional(readOnly = true)
    public List<PointAchievementResponse> getAll() {
        Long groupId = configService.getCurrentFamilyGroupId();
        return achievementRepository.findActiveByGroupOrSystem(groupId).stream()
                .map(a -> toResponse(a, null)).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<PointAchievementResponse> getEarnedByParticipant(Long participantId) {
        Long groupId = configService.getCurrentFamilyGroupId();
        List<PointAchievement> all = achievementRepository.findActiveByGroupOrSystem(groupId);
        Set<Long> earnedIds = memberAchievementRepository.findByParticipantId(participantId).stream()
                .map(ma -> ma.getAchievement().getId()).collect(Collectors.toSet());
        return all.stream().map(a -> {
            PointAchievementResponse r = toResponse(a, null);
            r.setEarned(earnedIds.contains(a.getId()));
            if (r.getEarned()) {
                memberAchievementRepository.findByParticipantIdAndAchievementId(participantId, a.getId())
                        .ifPresent(ma -> r.setEarnedAt(ma.getEarnedAt()));
            }
            return r;
        }).collect(Collectors.toList());
    }

    @Transactional
    public PointAchievementResponse create(PointAchievementRequest request) {
        PointAchievement achievement = PointAchievement.builder()
                .familyGroup(configService.getCurrentFamilyGroup())
                .name(request.getName())
                .description(request.getDescription())
                .type(AchievementType.valueOf(request.getType()))
                .icon(request.getIcon())
                .color(request.getColor())
                .requiredValue(request.getRequiredValue())
                .bonusPoints(request.getBonusPoints() != null ? request.getBonusPoints() : 0)
                .build();
        return toResponse(achievementRepository.save(achievement), null);
    }

    @Transactional
    public PointAchievementResponse update(Long id, PointAchievementRequest request) {
        PointAchievement a = achievementRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Yutuq topilmadi: " + id));
        a.setName(request.getName());
        a.setDescription(request.getDescription());
        a.setType(AchievementType.valueOf(request.getType()));
        a.setIcon(request.getIcon());
        a.setColor(request.getColor());
        a.setRequiredValue(request.getRequiredValue());
        if (request.getBonusPoints() != null) a.setBonusPoints(request.getBonusPoints());
        return toResponse(achievementRepository.save(a), null);
    }

    @Transactional
    public void delete(Long id) {
        achievementRepository.deleteById(id);
    }

    @Transactional
    public void checkAndAwardAchievements(PointParticipant participant) {
        Long groupId = participant.getFamilyGroup().getId();
        List<PointAchievement> achievements = achievementRepository.findActiveByGroupOrSystem(groupId);
        PointBalance balance = balanceRepository.findByParticipantId(participant.getId()).orElse(null);
        if (balance == null) return;

        for (PointAchievement achievement : achievements) {
            if (memberAchievementRepository.existsByParticipantIdAndAchievementId(participant.getId(), achievement.getId())) {
                continue;
            }

            boolean earned = false;
            switch (achievement.getType()) {
                case TASK_COUNT:
                    long taskCount = taskRepository.countVerifiedByParticipant(participant.getId());
                    earned = taskCount >= achievement.getRequiredValue();
                    break;
                case STREAK:
                    earned = balance.getCurrentStreak() >= achievement.getRequiredValue();
                    break;
                case POINT_MILESTONE:
                    earned = balance.getTotalEarned() >= achievement.getRequiredValue();
                    break;
                case SAVINGS_GOAL:
                    earned = balance.getSavingsBalance() >= achievement.getRequiredValue();
                    break;
                default:
                    break;
            }

            if (earned) {
                awardAchievement(participant, achievement);
            }
        }
    }

    private void awardAchievement(PointParticipant participant, PointAchievement achievement) {
        PointMemberAchievement ma = PointMemberAchievement.builder()
                .participant(participant)
                .achievement(achievement)
                .earnedAt(LocalDateTime.now())
                .build();
        memberAchievementRepository.save(ma);

        if (achievement.getBonusPoints() > 0) {
            transactionService.createTransaction(
                    participant, PointTransactionType.ACHIEVEMENT,
                    achievement.getBonusPoints(),
                    "Yutuq erishildi: " + achievement.getName(),
                    null, null
            );
        }

        log.info("Yutuq berildi: {} -> {}", participant.getDisplayName(), achievement.getName());
    }

    private PointAchievementResponse toResponse(PointAchievement a, Long participantId) {
        PointAchievementResponse r = new PointAchievementResponse();
        r.setId(a.getId());
        r.setName(a.getName());
        r.setDescription(a.getDescription());
        r.setType(a.getType().name());
        r.setIcon(a.getIcon());
        r.setColor(a.getColor());
        r.setRequiredValue(a.getRequiredValue());
        r.setBonusPoints(a.getBonusPoints());
        r.setIsSystem(a.getIsSystem());
        r.setIsActive(a.getIsActive());
        r.setEarned(false);
        return r;
    }
}
