package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.dto.request.PointConversionRequest;
import uz.familyfinance.api.dto.request.TransactionRequest;
import uz.familyfinance.api.dto.response.PointConversionResponse;
import uz.familyfinance.api.entity.*;
import uz.familyfinance.api.enums.PointTransactionType;
import uz.familyfinance.api.enums.ScopeType;
import uz.familyfinance.api.enums.TransactionType;
import uz.familyfinance.api.exception.BadRequestException;
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
    /** BALL tranzaksiyasi (PointTransaction) — moliyaviy Transaction bilan aralashtirmang. */
    private final PointTransactionService transactionService;
    private final PointConfigService configService;
    private final AccountService accountService;
    /** MOLIYAVIY tranzaksiya (double-entry + balans) — ball hamyonidan pulga o'tishda. */
    private final TransactionService financialTransactionService;

    /** PointConfig valyutasi sozlanmagan bo'lsa ishlatiladigan default. */
    private static final String DEFAULT_CURRENCY = "UZS";
    /** PointConfig stavkasi sozlanmagan bo'lsa: 1 ball = 100 birlik. */
    private static final BigDecimal DEFAULT_CONVERSION_RATE = BigDecimal.valueOf(100);

    @Transactional
    public PointConversionResponse convert(PointConversionRequest request) {
        var userDetails = configService.getCurrentUserDetails();
        PointParticipant participant = participantService.findById(request.getParticipantId());

        // ADR-002 Q1: ballarni pulga aylantirish FAQAT xonadon hamyonida (kelajakda maktab/CLASS
        // hamyonlari konvertatsiya qilinmaydi — o'qituvchi "pul chiqaruvchi" bo'lib qolmasin).
        if (participant.getScope() == null
                || participant.getScope().getType() != ScopeType.HOUSEHOLD) {
            throw new IllegalArgumentException(
                    "Ballarni pulga aylantirish faqat xonadon hamyonida mumkin");
        }

        PointBalance balance = balanceRepository.findByParticipantId(participant.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Balans topilmadi"));

        if (balance.getCurrentBalance() < request.getPoints()) {
            throw new IllegalArgumentException("Yetarli ball mavjud emas. Mavjud: " + balance.getCurrentBalance());
        }

        PointConfig config = configService.getConfigEntity();
        BigDecimal conversionRate = config != null ? config.getConversionRate() : DEFAULT_CONVERSION_RATE;
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
                "Ball ayirboshlash: " + request.getPoints() + " ball -> " + moneyAmount + " " + (config != null ? config.getCurrency() : DEFAULT_CURRENCY),
                null, userDetails.getUser()
        );

        // Konversiya yozuvi
        PointConversion conversion = PointConversion.builder()
                .scope(participant.getScope())
                .participant(participant)
                .pointsConverted(request.getPoints())
                .conversionRate(conversionRate)
                .moneyAmount(moneyAmount)
                .currency(config != null ? config.getCurrency() : DEFAULT_CURRENCY)
                .approvedBy(userDetails.getUser())
                .conversionDate(LocalDateTime.now())
                .build();

        if (request.getTargetAccountId() != null) {
            String currency = config != null ? config.getCurrency() : DEFAULT_CURRENCY;
            Account account = resolveTargetAccount(request.getTargetAccountId(), participant, currency);
            conversion.setTargetAccount(account);
            // Balans + tarix BIRGA: avval accountRepository.addToBalance() to'g'ridan-to'g'ri
            // chaqirilardi va Transaction yozuvi yaratilmasdi — natijada hisob balansi
            // tranzaksiyalar yig'indisiga teng bo'lmay qolardi (sababi keyin topilmaydigan
            // buxgalteriya nosozligi: "balansim qayerdan oshdi?" — tarixda hech narsa yo'q).
            // createSystem INCOME uchun transit hisobni o'zi topib double-entry quradi.
            financialTransactionService.createSystem(
                    conversionIncomeRequest(account, moneyAmount, request.getPoints()));
        }

        return toResponse(conversionRepository.save(conversion));
    }

    /**
     * Konversiya tushadigan hisobni yuklaydi va uchta shartni tekshiradi: yozish huquqi
     * (IDOR), ball hamyoni bilan bir xil xonadon, va valyuta mosligi.
     *
     * <p>Avval bu yerda HECH QANDAY tekshiruv yo'q edi — begona oilaning hisob balansini
     * oshirish mumkin edi.</p>
     */
    private Account resolveTargetAccount(Long accountId, PointParticipant participant, String currency) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Hisob topilmadi"));
        accountService.assertCanModify(account);

        // Ball qaysi xonadonda to'plangan bo'lsa, pul ham o'sha xonadon hisobiga tushadi
        // (ADR-002 Q1 ruhi: konversiya xonadon hamyonidan chiqmaydi).
        Long accountScopeId = account.getHomeScope() != null ? account.getHomeScope().getId() : null;
        if (accountScopeId == null || !accountScopeId.equals(participant.getScope().getId())) {
            throw new BadRequestException(
                    "Ballarni faqat o'z xonadoningiz hisobiga aylantirish mumkin");
        }

        // Valyuta mos kelmasa summa jimgina "boshqa pulga" aylanardi (100 UZS -> 100 USD).
        if (account.getCurrency() != null && !account.getCurrency().equalsIgnoreCase(currency)) {
            throw new BadRequestException(String.format(
                    "Hisob valyutasi (%s) ball valyutasiga (%s) mos emas",
                    account.getCurrency(), currency));
        }
        return account;
    }

    /** Konversiyani moliyaviy tarixga yozadigan INCOME so'rovi. */
    private TransactionRequest conversionIncomeRequest(Account account, BigDecimal amount, int points) {
        TransactionRequest tx = new TransactionRequest();
        tx.setType(TransactionType.INCOME);
        tx.setAccountId(account.getId());
        tx.setAmount(amount);
        tx.setTransactionDate(LocalDateTime.now());
        tx.setDescription("Ball konversiyasi: " + points + " ball");
        return tx;
    }

    @Transactional(readOnly = true)
    public Page<PointConversionResponse> getByParticipant(Long participantId, Pageable pageable) {
        return conversionRepository.findByParticipantIdOrderByConversionDateDesc(participantId, pageable)
                .map(this::toResponse);
    }

    public BigDecimal calculateConversion(int points) {
        PointConfig config = configService.getConfigEntity();
        BigDecimal rate = config != null ? config.getConversionRate() : DEFAULT_CONVERSION_RATE;
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
