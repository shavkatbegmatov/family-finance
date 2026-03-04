package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.dto.response.PointSavingsAccountResponse;
import uz.familyfinance.api.entity.*;
import uz.familyfinance.api.enums.PointTransactionType;
import uz.familyfinance.api.exception.ResourceNotFoundException;
import uz.familyfinance.api.repository.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class PointSavingsService {

    private final PointSavingsAccountRepository savingsRepository;
    private final PointBalanceRepository balanceRepository;
    private final PointParticipantService participantService;
    private final PointTransactionService transactionService;
    private final PointConfigService configService;

    @Transactional(readOnly = true)
    public PointSavingsAccountResponse getByParticipant(Long participantId) {
        PointSavingsAccount sa = savingsRepository.findByParticipantId(participantId)
                .orElseThrow(() -> new ResourceNotFoundException("Jamg'arma hisobi topilmadi"));
        return toResponse(sa);
    }

    @Transactional
    public PointSavingsAccountResponse deposit(Long participantId, int amount) {
        var userDetails = configService.getCurrentUserDetails();
        PointParticipant participant = participantService.findById(participantId);
        PointBalance balance = balanceRepository.findByParticipantId(participantId)
                .orElseThrow(() -> new ResourceNotFoundException("Balans topilmadi"));

        if (balance.getCurrentBalance() < amount) {
            throw new IllegalArgumentException("Yetarli ball mavjud emas");
        }

        PointSavingsAccount sa = savingsRepository.findByParticipantId(participantId)
                .orElseThrow(() -> new ResourceNotFoundException("Jamg'arma hisobi topilmadi"));

        // Asosiy balansdan ayirish
        transactionService.createTransaction(
                participant, PointTransactionType.SAVINGS_DEPOSIT,
                -amount, "Jamg'armaga qo'yildi: " + amount + " ball",
                null, userDetails.getUser()
        );

        // Jamg'armaga qo'shish
        sa.setBalance(sa.getBalance() + amount);
        savingsRepository.save(sa);
        balanceRepository.addToSavings(balance.getId(), amount);

        return toResponse(sa);
    }

    @Transactional
    public PointSavingsAccountResponse withdraw(Long participantId, int amount) {
        var userDetails = configService.getCurrentUserDetails();
        PointParticipant participant = participantService.findById(participantId);
        PointSavingsAccount sa = savingsRepository.findByParticipantId(participantId)
                .orElseThrow(() -> new ResourceNotFoundException("Jamg'arma hisobi topilmadi"));

        if (sa.getBalance() < amount) {
            throw new IllegalArgumentException("Jamg'armada yetarli ball mavjud emas");
        }

        // Asosiy balansga qaytarish
        transactionService.createTransaction(
                participant, PointTransactionType.SAVINGS_WITHDRAW,
                amount, "Jamg'armadan olingan: " + amount + " ball",
                null, userDetails.getUser()
        );

        PointBalance balance = balanceRepository.findByParticipantId(participantId).orElse(null);
        sa.setBalance(sa.getBalance() - amount);
        savingsRepository.save(sa);
        if (balance != null) {
            balanceRepository.addToSavings(balance.getId(), -amount);
        }

        return toResponse(sa);
    }

    private PointSavingsAccountResponse toResponse(PointSavingsAccount sa) {
        PointSavingsAccountResponse r = new PointSavingsAccountResponse();
        r.setId(sa.getId());
        r.setParticipantId(sa.getParticipant().getId());
        r.setParticipantName(sa.getParticipant().getDisplayName());
        r.setBalance(sa.getBalance());
        r.setInterestRate(sa.getInterestRate());
        r.setLastInterestAppliedAt(sa.getLastInterestAppliedAt());
        r.setTotalInterestEarned(sa.getTotalInterestEarned());
        return r;
    }
}
