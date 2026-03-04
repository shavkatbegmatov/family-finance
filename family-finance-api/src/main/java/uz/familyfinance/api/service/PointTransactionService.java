package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.dto.response.PointTransactionResponse;
import uz.familyfinance.api.entity.*;
import uz.familyfinance.api.enums.PointTransactionType;
import uz.familyfinance.api.repository.PointBalanceRepository;
import uz.familyfinance.api.repository.PointTransactionRepository;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class PointTransactionService {

    private final PointTransactionRepository transactionRepository;
    private final PointBalanceRepository balanceRepository;
    private final PointConfigService configService;

    @Transactional
    public PointTransaction createTransaction(PointParticipant participant, PointTransactionType type,
                                               int amount, String description, PointTask task, User createdBy) {
        PointBalance balance = balanceRepository.findByParticipantId(participant.getId())
                .orElseThrow(() -> new IllegalStateException("Ishtirokchi balansi topilmadi"));

        int balanceBefore = balance.getCurrentBalance();
        int balanceAfter = balanceBefore + amount;

        PointTransaction tx = PointTransaction.builder()
                .familyGroup(participant.getFamilyGroup())
                .participant(participant)
                .type(type)
                .amount(amount)
                .balanceBefore(balanceBefore)
                .balanceAfter(balanceAfter)
                .description(description)
                .task(task)
                .createdBy(createdBy)
                .transactionDate(LocalDateTime.now())
                .build();

        transactionRepository.save(tx);

        // Atomik balance yangilash
        balanceRepository.addToBalance(balance.getId(), amount);

        if (type == PointTransactionType.TASK_PENALTY) {
            balanceRepository.addToPenalty(balance.getId(), Math.abs(amount));
        }

        log.debug("Tranzaksiya yaratildi: {} {} ball, ishtirokchi: {}", type, amount, participant.getDisplayName());
        return tx;
    }

    @Transactional(readOnly = true)
    public Page<PointTransactionResponse> getByParticipant(Long participantId, Pageable pageable) {
        return transactionRepository.findByParticipantIdOrderByTransactionDateDesc(participantId, pageable)
                .map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public Page<PointTransactionResponse> getByGroup(Pageable pageable) {
        Long groupId = configService.getCurrentFamilyGroupId();
        return transactionRepository.findByFamilyGroupIdOrderByTransactionDateDesc(groupId, pageable)
                .map(this::toResponse);
    }

    PointTransactionResponse toResponse(PointTransaction t) {
        PointTransactionResponse r = new PointTransactionResponse();
        r.setId(t.getId());
        r.setParticipantId(t.getParticipant().getId());
        r.setParticipantName(t.getParticipant().getDisplayName());
        r.setType(t.getType().name());
        r.setAmount(t.getAmount());
        r.setBalanceBefore(t.getBalanceBefore());
        r.setBalanceAfter(t.getBalanceAfter());
        r.setDescription(t.getDescription());
        r.setTransactionDate(t.getTransactionDate());
        if (t.getTask() != null) {
            r.setTaskId(t.getTask().getId());
            r.setTaskTitle(t.getTask().getTitle());
        }
        if (t.getCreatedBy() != null) {
            r.setCreatedByName(t.getCreatedBy().getFullName());
        }
        return r;
    }
}
