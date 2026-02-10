package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.dto.request.SavingsContributionRequest;
import uz.familyfinance.api.dto.request.SavingsGoalRequest;
import uz.familyfinance.api.dto.response.SavingsContributionResponse;
import uz.familyfinance.api.dto.response.SavingsGoalResponse;
import uz.familyfinance.api.entity.Account;
import uz.familyfinance.api.entity.SavingsContribution;
import uz.familyfinance.api.entity.SavingsGoal;
import uz.familyfinance.api.exception.ResourceNotFoundException;
import uz.familyfinance.api.repository.AccountRepository;
import uz.familyfinance.api.repository.SavingsContributionRepository;
import uz.familyfinance.api.repository.SavingsGoalRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SavingsGoalService {

    private final SavingsGoalRepository savingsGoalRepository;
    private final SavingsContributionRepository contributionRepository;
    private final AccountRepository accountRepository;
    private final StaffNotificationService notificationService;

    @Transactional(readOnly = true)
    public Page<SavingsGoalResponse> getAll(Pageable pageable) {
        return savingsGoalRepository.findAll(pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public SavingsGoalResponse getById(Long id) {
        return toResponse(findById(id));
    }

    @Transactional
    public SavingsGoalResponse create(SavingsGoalRequest request) {
        SavingsGoal goal = SavingsGoal.builder()
                .name(request.getName())
                .targetAmount(request.getTargetAmount())
                .deadline(request.getDeadline())
                .icon(request.getIcon())
                .color(request.getColor())
                .build();

        if (request.getAccountId() != null) {
            Account account = accountRepository.findById(request.getAccountId())
                    .orElseThrow(() -> new ResourceNotFoundException("Hisob topilmadi"));
            goal.setAccount(account);
        }

        return toResponse(savingsGoalRepository.save(goal));
    }

    @Transactional
    public SavingsGoalResponse update(Long id, SavingsGoalRequest request) {
        SavingsGoal goal = findById(id);
        goal.setName(request.getName());
        goal.setTargetAmount(request.getTargetAmount());
        goal.setDeadline(request.getDeadline());
        goal.setIcon(request.getIcon());
        goal.setColor(request.getColor());

        if (request.getAccountId() != null) {
            Account account = accountRepository.findById(request.getAccountId())
                    .orElseThrow(() -> new ResourceNotFoundException("Hisob topilmadi"));
            goal.setAccount(account);
        } else {
            goal.setAccount(null);
        }

        return toResponse(savingsGoalRepository.save(goal));
    }

    @Transactional
    public void delete(Long id) {
        savingsGoalRepository.deleteById(id);
    }

    @Transactional
    public SavingsContributionResponse addContribution(Long goalId, SavingsContributionRequest request) {
        SavingsGoal goal = findById(goalId);

        SavingsContribution contribution = SavingsContribution.builder()
                .savingsGoal(goal)
                .amount(request.getAmount())
                .contributionDate(request.getContributionDate())
                .note(request.getNote())
                .build();

        contributionRepository.save(contribution);

        // Atomic balance update
        savingsGoalRepository.addToCurrentAmount(goal.getId(), request.getAmount());

        BigDecimal current = goal.getCurrentAmount() != null ? goal.getCurrentAmount() : BigDecimal.ZERO;
        BigDecimal newAmount = current.add(request.getAmount());
        if (newAmount.compareTo(goal.getTargetAmount()) >= 0) {
            savingsGoalRepository.markAsCompleted(goal.getId());
            notificationService.createGlobalNotification(
                    "Jamg'arma maqsadi bajarildi!",
                    String.format("\"%s\" maqsadi to'liq bajarildi!", goal.getName()),
                    uz.familyfinance.api.enums.StaffNotificationType.SAVINGS_MILESTONE,
                    "SAVINGS_GOAL", goal.getId());
        }

        return toContributionResponse(contribution);
    }

    @Transactional(readOnly = true)
    public List<SavingsContributionResponse> getContributions(Long goalId) {
        return contributionRepository.findBySavingsGoalIdOrderByContributionDateDesc(goalId).stream()
                .map(this::toContributionResponse).collect(Collectors.toList());
    }

    private SavingsGoal findById(Long id) {
        return savingsGoalRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Jamg'arma maqsadi topilmadi: " + id));
    }

    private SavingsGoalResponse toResponse(SavingsGoal g) {
        SavingsGoalResponse r = new SavingsGoalResponse();
        r.setId(g.getId());
        r.setName(g.getName());
        r.setTargetAmount(g.getTargetAmount());
        r.setCurrentAmount(g.getCurrentAmount());
        r.setDeadline(g.getDeadline());
        r.setIcon(g.getIcon());
        r.setColor(g.getColor());
        r.setIsCompleted(g.getIsCompleted());
        r.setCreatedAt(g.getCreatedAt());
        BigDecimal currentAmount = g.getCurrentAmount() != null ? g.getCurrentAmount() : BigDecimal.ZERO;
        if (g.getTargetAmount().compareTo(BigDecimal.ZERO) > 0) {
            r.setPercentage(currentAmount.multiply(BigDecimal.valueOf(100))
                    .divide(g.getTargetAmount(), 2, RoundingMode.HALF_UP).doubleValue());
        } else {
            r.setPercentage(0.0);
        }
        if (g.getAccount() != null) {
            r.setAccountId(g.getAccount().getId());
            r.setAccountName(g.getAccount().getName());
        }
        return r;
    }

    private SavingsContributionResponse toContributionResponse(SavingsContribution c) {
        SavingsContributionResponse r = new SavingsContributionResponse();
        r.setId(c.getId());
        r.setAmount(c.getAmount());
        r.setContributionDate(c.getContributionDate());
        r.setNote(c.getNote());
        r.setCreatedAt(c.getCreatedAt());
        if (c.getSavingsGoal() != null) {
            r.setSavingsGoalId(c.getSavingsGoal().getId());
            r.setSavingsGoalName(c.getSavingsGoal().getName());
        }
        return r;
    }
}
