package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.dto.request.PointTaskRequest;
import uz.familyfinance.api.dto.response.PointTaskResponse;
import uz.familyfinance.api.entity.*;
import uz.familyfinance.api.enums.*;
import uz.familyfinance.api.exception.ResourceNotFoundException;
import uz.familyfinance.api.repository.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PointTaskService {

    private final PointTaskRepository taskRepository;
    private final PointParticipantService participantService;
    private final PointTransactionService transactionService;
    private final PointBalanceRepository balanceRepository;
    private final PointMultiplierEventRepository eventRepository;
    private final PointConfigService configService;

    @Transactional(readOnly = true)
    public Page<PointTaskResponse> getAll(Pageable pageable) {
        Long groupId = configService.getCurrentFamilyGroupId();
        return taskRepository.findByFamilyGroupId(groupId, pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public Page<PointTaskResponse> getByStatus(PointTaskStatus status, Pageable pageable) {
        Long groupId = configService.getCurrentFamilyGroupId();
        return taskRepository.findByFamilyGroupIdAndStatus(groupId, status, pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public PointTaskResponse getById(Long id) {
        return toResponse(findById(id));
    }

    @Transactional(readOnly = true)
    public List<PointTaskResponse> getPendingVerification() {
        Long groupId = configService.getCurrentFamilyGroupId();
        return taskRepository.findPendingVerification(groupId).stream()
                .map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<PointTaskResponse> getMyTasks(Long participantId) {
        return taskRepository.findByAssignedToId(participantId).stream()
                .map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional
    public PointTaskResponse create(PointTaskRequest request) {
        var userDetails = configService.getCurrentUserDetails();
        FamilyGroup group = configService.getCurrentFamilyGroup();

        PointTask task = PointTask.builder()
                .familyGroup(group)
                .title(request.getTitle())
                .description(request.getDescription())
                .category(PointTaskCategory.valueOf(request.getCategory()))
                .pointValue(request.getPointValue())
                .penaltyValue(request.getPenaltyValue() != null ? request.getPenaltyValue() : 0)
                .assignedBy(userDetails.getUser())
                .recurrence(request.getRecurrence() != null ?
                        PointTaskRecurrence.valueOf(request.getRecurrence()) : PointTaskRecurrence.ONCE)
                .deadline(request.getDeadline())
                .icon(request.getIcon())
                .color(request.getColor())
                .parentTaskId(request.getParentTaskId())
                .build();

        if (request.getAssignedToId() != null) {
            PointParticipant participant = participantService.findById(request.getAssignedToId());
            task.setAssignedTo(participant);
            task.setStatus(PointTaskStatus.ASSIGNED);
        }

        return toResponse(taskRepository.save(task));
    }

    @Transactional
    public PointTaskResponse update(Long id, PointTaskRequest request) {
        PointTask task = findById(id);
        task.setTitle(request.getTitle());
        task.setDescription(request.getDescription());
        task.setCategory(PointTaskCategory.valueOf(request.getCategory()));
        task.setPointValue(request.getPointValue());
        task.setPenaltyValue(request.getPenaltyValue() != null ? request.getPenaltyValue() : 0);
        task.setDeadline(request.getDeadline());
        task.setIcon(request.getIcon());
        task.setColor(request.getColor());

        if (request.getRecurrence() != null) {
            task.setRecurrence(PointTaskRecurrence.valueOf(request.getRecurrence()));
        }

        if (request.getAssignedToId() != null) {
            task.setAssignedTo(participantService.findById(request.getAssignedToId()));
            if (task.getStatus() == PointTaskStatus.DRAFT) {
                task.setStatus(PointTaskStatus.ASSIGNED);
            }
        }

        return toResponse(taskRepository.save(task));
    }

    @Transactional
    public PointTaskResponse submit(Long id) {
        PointTask task = findById(id);
        if (task.getStatus() != PointTaskStatus.ASSIGNED && task.getStatus() != PointTaskStatus.IN_PROGRESS) {
            throw new IllegalStateException("Vazifani topshirish mumkin emas, joriy holat: " + task.getStatus());
        }

        // Auto-approve
        PointConfig config = configService.getConfigEntity();
        if (config != null && config.getAutoApproveBelow() != null
                && task.getPointValue() <= config.getAutoApproveBelow()) {
            return autoVerify(task);
        }

        task.setStatus(PointTaskStatus.SUBMITTED);
        task.setCompletedAt(LocalDateTime.now());
        return toResponse(taskRepository.save(task));
    }

    @Transactional
    public PointTaskResponse verify(Long id) {
        PointTask task = findById(id);
        if (task.getStatus() != PointTaskStatus.SUBMITTED) {
            throw new IllegalStateException("Vazifani tasdiqlash mumkin emas, joriy holat: " + task.getStatus());
        }
        return autoVerify(task);
    }

    private PointTaskResponse autoVerify(PointTask task) {
        var userDetails = configService.getCurrentUserDetails();
        task.setStatus(PointTaskStatus.VERIFIED);
        task.setVerifiedBy(userDetails.getUser());
        task.setCompletedAt(LocalDateTime.now());

        // Multiplier hisoblash
        BigDecimal totalMultiplier = calculateMultiplier(task);
        task.setMultiplier(totalMultiplier);

        int effectivePoints = totalMultiplier.multiply(BigDecimal.valueOf(task.getPointValue())).intValue();

        // Ball berish
        if (task.getAssignedTo() != null) {
            transactionService.createTransaction(
                    task.getAssignedTo(),
                    PointTransactionType.TASK_REWARD,
                    effectivePoints,
                    "Vazifa bajarildi: " + task.getTitle(),
                    task,
                    userDetails.getUser()
            );

            // Streak yangilash
            PointBalance balance = balanceRepository.findByParticipantId(task.getAssignedTo().getId()).orElse(null);
            if (balance != null) {
                balanceRepository.incrementStreak(balance.getId(), LocalDateTime.now());
            }
        }

        return toResponse(taskRepository.save(task));
    }

    @Transactional
    public PointTaskResponse reject(Long id, String reason) {
        PointTask task = findById(id);
        if (task.getStatus() != PointTaskStatus.SUBMITTED) {
            throw new IllegalStateException("Vazifani rad etish mumkin emas, joriy holat: " + task.getStatus());
        }

        var userDetails = configService.getCurrentUserDetails();
        task.setStatus(PointTaskStatus.REJECTED);
        task.setVerifiedBy(userDetails.getUser());
        task.setRejectionReason(reason);

        // Jarima ball
        if (task.getPenaltyValue() > 0 && task.getAssignedTo() != null) {
            transactionService.createTransaction(
                    task.getAssignedTo(),
                    PointTransactionType.TASK_PENALTY,
                    -task.getPenaltyValue(),
                    "Vazifa rad etildi: " + task.getTitle(),
                    task,
                    userDetails.getUser()
            );
        }

        return toResponse(taskRepository.save(task));
    }

    @Transactional
    public void delete(Long id) {
        taskRepository.deleteById(id);
    }

    private BigDecimal calculateMultiplier(PointTask task) {
        BigDecimal multiplier = BigDecimal.ONE;

        // Faol eventlardan multiplier
        List<PointMultiplierEvent> events = eventRepository.findActiveEvents(
                task.getFamilyGroup().getId(), LocalDateTime.now(), task.getCategory());
        for (PointMultiplierEvent event : events) {
            multiplier = multiplier.multiply(event.getMultiplier());
        }

        // Streak bonus
        if (task.getAssignedTo() != null) {
            PointConfig config = configService.getConfigEntity();
            if (config != null && config.getStreakBonusEnabled()) {
                PointBalance balance = balanceRepository.findByParticipantId(task.getAssignedTo().getId()).orElse(null);
                if (balance != null && balance.getCurrentStreak() >= 3) {
                    BigDecimal streakBonus = config.getStreakBonusPercentage()
                            .multiply(BigDecimal.valueOf(balance.getCurrentStreak()));
                    multiplier = multiplier.add(streakBonus);
                }
            }
        }

        return multiplier;
    }

    PointTask findById(Long id) {
        return taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vazifa topilmadi: " + id));
    }

    PointTaskResponse toResponse(PointTask t) {
        PointTaskResponse r = new PointTaskResponse();
        r.setId(t.getId());
        r.setFamilyGroupId(t.getFamilyGroup().getId());
        r.setTitle(t.getTitle());
        r.setDescription(t.getDescription());
        r.setCategory(t.getCategory().name());
        r.setPointValue(t.getPointValue());
        r.setPenaltyValue(t.getPenaltyValue());
        r.setStatus(t.getStatus().name());
        r.setRecurrence(t.getRecurrence().name());
        r.setDeadline(t.getDeadline());
        r.setCompletedAt(t.getCompletedAt());
        r.setRejectionReason(t.getRejectionReason());
        r.setIcon(t.getIcon());
        r.setColor(t.getColor());
        r.setParentTaskId(t.getParentTaskId());
        r.setMultiplier(t.getMultiplier());
        r.setCreatedAt(t.getCreatedAt());
        r.setAssignedByName(t.getAssignedBy().getFullName());

        int effectivePoints = t.getMultiplier().multiply(BigDecimal.valueOf(t.getPointValue())).intValue();
        r.setEffectivePoints(effectivePoints);

        if (t.getAssignedTo() != null) {
            r.setAssignedToId(t.getAssignedTo().getId());
            r.setAssignedToName(t.getAssignedTo().getDisplayName());
        }
        if (t.getVerifiedBy() != null) {
            r.setVerifiedByName(t.getVerifiedBy().getFullName());
        }
        return r;
    }
}
