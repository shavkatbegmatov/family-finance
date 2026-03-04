package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.dto.request.PointConversionRequest;
import uz.familyfinance.api.dto.response.PointConversionResponse;
import uz.familyfinance.api.entity.*;
import uz.familyfinance.api.enums.PointTransactionType;
import uz.familyfinance.api.exception.ResourceNotFoundException;
import uz.familyfinance.api.repository.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class PointConversionService {

    private final PointConversionRepository conversionRepository;
    private final PointBalanceRepository balanceRepository;
    private final AccountRepository accountRepository;
    private final PointParticipantService participantService;
    private final PointTransactionService transactionService;
    private final PointConfigService configService;

    @Transactional
    public PointConversionResponse convert(PointConversionRequest request) {
        var userDetails = configService.getCurrentUserDetails();
        PointParticipant participant = participantService.findById(request.getParticipantId());
        PointBalance balance = balanceRepository.findByParticipantId(participant.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Balans topilmadi"));

        if (balance.getCurrentBalance() < request.getPoints()) {
            throw new IllegalArgumentException("Yetarli ball mavjud emas. Mavjud: " + balance.getCurrentBalance());
        }

        PointConfig config = configService.getConfigEntity();
        BigDecimal conversionRate = config != null ? config.getConversionRate() : BigDecimal.valueOf(100);
        BigDecimal inflationMultiplier = balance.getInflationMultiplier();

        // Haqiqiy qiymat = ball * inflyatsiya_multiplikatori * konversiya_stavkasi
        BigDecimal moneyAmount = BigDecimal.valueOf(request.getPoints())
                .multiply(inflationMultiplier)
                .multiply(conversionRate)
                .setScale(2, RoundingMode.HALF_UP);

        // Tranzaksiya yaratish
        transactionService.createTransaction(
                participant, PointTransactionType.CONVERSION,
                -request.getPoints(),
                "Ball ayirboshlash: " + request.getPoints() + " ball -> " + moneyAmount + " " + (config != null ? config.getCurrency() : "UZS"),
                null, userDetails.getUser()
        );

        // Konversiya yozuvi
        PointConversion conversion = PointConversion.builder()
                .familyGroup(participant.getFamilyGroup())
                .participant(participant)
                .pointsConverted(request.getPoints())
                .conversionRate(conversionRate)
                .moneyAmount(moneyAmount)
                .currency(config != null ? config.getCurrency() : "UZS")
                .approvedBy(userDetails.getUser())
                .conversionDate(LocalDateTime.now())
                .build();

        if (request.getTargetAccountId() != null) {
            Account account = accountRepository.findById(request.getTargetAccountId())
                    .orElseThrow(() -> new ResourceNotFoundException("Hisob topilmadi"));
            conversion.setTargetAccount(account);
            accountRepository.addToBalance(account.getId(), moneyAmount);
        }

        return toResponse(conversionRepository.save(conversion));
    }

    @Transactional(readOnly = true)
    public Page<PointConversionResponse> getByParticipant(Long participantId, Pageable pageable) {
        return conversionRepository.findByParticipantIdOrderByConversionDateDesc(participantId, pageable)
                .map(this::toResponse);
    }

    public BigDecimal calculateConversion(int points) {
        PointConfig config = configService.getConfigEntity();
        BigDecimal rate = config != null ? config.getConversionRate() : BigDecimal.valueOf(100);
        return BigDecimal.valueOf(points).multiply(rate).setScale(2, RoundingMode.HALF_UP);
    }

    private PointConversionResponse toResponse(PointConversion c) {
        PointConversionResponse r = new PointConversionResponse();
        r.setId(c.getId());
        r.setParticipantId(c.getParticipant().getId());
        r.setParticipantName(c.getParticipant().getDisplayName());
        r.setPointsConverted(c.getPointsConverted());
        r.setConversionRate(c.getConversionRate());
        r.setMoneyAmount(c.getMoneyAmount());
        r.setCurrency(c.getCurrency());
        r.setConversionDate(c.getConversionDate());
        if (c.getTargetAccount() != null) {
            r.setTargetAccountId(c.getTargetAccount().getId());
            r.setTargetAccountName(c.getTargetAccount().getName());
        }
        if (c.getApprovedBy() != null) {
            r.setApprovedByName(c.getApprovedBy().getFullName());
        }
        return r;
    }
}
