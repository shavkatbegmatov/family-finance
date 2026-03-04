package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.dto.request.PointInvestmentRequest;
import uz.familyfinance.api.dto.response.PointInvestmentResponse;
import uz.familyfinance.api.entity.*;
import uz.familyfinance.api.enums.PointInvestmentType;
import uz.familyfinance.api.enums.PointTransactionType;
import uz.familyfinance.api.exception.ResourceNotFoundException;
import uz.familyfinance.api.repository.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PointInvestmentService {

    private final PointInvestmentRepository investmentRepository;
    private final PointBalanceRepository balanceRepository;
    private final PointParticipantService participantService;
    private final PointTransactionService transactionService;
    private final PointConfigService configService;

    @Transactional(readOnly = true)
    public List<PointInvestmentResponse> getByParticipant(Long participantId) {
        return investmentRepository.findByParticipantIdAndIsActiveTrue(participantId).stream()
                .map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional
    public PointInvestmentResponse create(Long participantId, PointInvestmentRequest request) {
        var userDetails = configService.getCurrentUserDetails();
        PointParticipant participant = participantService.findById(participantId);
        PointBalance balance = balanceRepository.findByParticipantId(participantId)
                .orElseThrow(() -> new ResourceNotFoundException("Balans topilmadi"));

        if (balance.getCurrentBalance() < request.getAmount()) {
            throw new IllegalArgumentException("Yetarli ball mavjud emas");
        }

        PointInvestmentType type = PointInvestmentType.valueOf(request.getType());

        // Balansdan ayirish
        transactionService.createTransaction(
                participant, PointTransactionType.INVESTMENT_BUY,
                -request.getAmount(),
                "Investitsiya: " + type.name() + " - " + request.getAmount() + " ball",
                null, userDetails.getUser()
        );

        balanceRepository.addToInvestment(balance.getId(), request.getAmount());

        PointInvestment investment = PointInvestment.builder()
                .familyGroup(participant.getFamilyGroup())
                .participant(participant)
                .type(type)
                .investedAmount(request.getAmount())
                .currentValue(request.getAmount())
                .maturityDate(request.getMaturityDate())
                .investedAt(LocalDateTime.now())
                .build();

        return toResponse(investmentRepository.save(investment));
    }

    @Transactional
    public PointInvestmentResponse sell(Long investmentId) {
        var userDetails = configService.getCurrentUserDetails();
        PointInvestment investment = investmentRepository.findById(investmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Investitsiya topilmadi"));

        if (!investment.getIsActive()) {
            throw new IllegalStateException("Investitsiya allaqachon sotilgan");
        }

        investment.setIsActive(false);

        // Qaytarish
        transactionService.createTransaction(
                investment.getParticipant(), PointTransactionType.INVESTMENT_SELL,
                investment.getCurrentValue(),
                "Investitsiya sotildi: " + investment.getCurrentValue() + " ball",
                null, userDetails.getUser()
        );

        PointBalance balance = balanceRepository.findByParticipantId(investment.getParticipant().getId()).orElse(null);
        if (balance != null) {
            balanceRepository.addToInvestment(balance.getId(), -investment.getInvestedAmount());
        }

        return toResponse(investmentRepository.save(investment));
    }

    private PointInvestmentResponse toResponse(PointInvestment i) {
        PointInvestmentResponse r = new PointInvestmentResponse();
        r.setId(i.getId());
        r.setParticipantId(i.getParticipant().getId());
        r.setParticipantName(i.getParticipant().getDisplayName());
        r.setType(i.getType().name());
        r.setInvestedAmount(i.getInvestedAmount());
        r.setCurrentValue(i.getCurrentValue());
        r.setReturnRate(i.getReturnRate());
        r.setInvestedAt(i.getInvestedAt());
        r.setMaturityDate(i.getMaturityDate());
        r.setIsActive(i.getIsActive());
        if (i.getInvestedAmount() > 0) {
            double profit = ((double)(i.getCurrentValue() - i.getInvestedAmount()) / i.getInvestedAmount()) * 100;
            r.setProfitPercentage(BigDecimal.valueOf(profit).setScale(2, RoundingMode.HALF_UP).doubleValue());
        }
        return r;
    }
}
