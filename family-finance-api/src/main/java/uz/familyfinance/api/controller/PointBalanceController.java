package uz.familyfinance.api.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.familyfinance.api.dto.request.ManualAwardRequest;
import uz.familyfinance.api.dto.response.*;
import uz.familyfinance.api.entity.PointBalance;
import uz.familyfinance.api.entity.PointParticipant;
import uz.familyfinance.api.enums.PermissionCode;
import uz.familyfinance.api.enums.PointTransactionType;
import uz.familyfinance.api.exception.ResourceNotFoundException;
import uz.familyfinance.api.repository.PointBalanceRepository;
import uz.familyfinance.api.security.RequiresPermission;
import uz.familyfinance.api.service.*;

import java.math.BigDecimal;
import java.math.RoundingMode;

@RestController
@RequestMapping("/v1/point-balances")
@RequiredArgsConstructor
public class PointBalanceController {

    private final PointBalanceRepository balanceRepository;
    private final PointTransactionService transactionService;
    private final PointParticipantService participantService;
    private final PointAchievementService achievementService;
    private final PointConfigService configService;

    @GetMapping("/{participantId}")
    @RequiresPermission(PermissionCode.POINTS_VIEW)
    public ResponseEntity<ApiResponse<PointBalanceResponse>> getBalance(@PathVariable Long participantId) {
        PointBalance balance = balanceRepository.findByParticipantIdWithParticipant(participantId)
                .orElseThrow(() -> new ResourceNotFoundException("Balans topilmadi"));
        return ResponseEntity.ok(ApiResponse.success(toResponse(balance)));
    }

    @GetMapping("/{participantId}/transactions")
    @RequiresPermission(PermissionCode.POINTS_VIEW)
    public ResponseEntity<ApiResponse<PagedResponse<PointTransactionResponse>>> getTransactions(
            @PathVariable Long participantId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<PointTransactionResponse> result = transactionService.getByParticipant(participantId,
                PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.success(PagedResponse.of(result)));
    }

    @PostMapping("/{participantId}/award")
    @RequiresPermission(PermissionCode.POINTS_AWARD)
    public ResponseEntity<ApiResponse<PointBalanceResponse>> award(
            @PathVariable Long participantId,
            @Valid @RequestBody ManualAwardRequest request) {
        var userDetails = configService.getCurrentUserDetails();
        PointParticipant participant = participantService.findById(participantId);
        transactionService.createTransaction(
                participant, PointTransactionType.MANUAL_AWARD,
                request.getAmount(),
                request.getDescription() != null ? request.getDescription() : "Qo'lda ball berish",
                null, userDetails.getUser()
        );
        achievementService.checkAndAwardAchievements(participant);
        PointBalance balance = balanceRepository.findByParticipantIdWithParticipant(participantId)
                .orElseThrow(() -> new ResourceNotFoundException("Balans topilmadi"));
        return ResponseEntity.ok(ApiResponse.success(toResponse(balance)));
    }

    @PostMapping("/{participantId}/deduct")
    @RequiresPermission(PermissionCode.POINTS_AWARD)
    public ResponseEntity<ApiResponse<PointBalanceResponse>> deduct(
            @PathVariable Long participantId,
            @Valid @RequestBody ManualAwardRequest request) {
        var userDetails = configService.getCurrentUserDetails();
        PointParticipant participant = participantService.findById(participantId);
        transactionService.createTransaction(
                participant, PointTransactionType.MANUAL_DEDUCT,
                -request.getAmount(),
                request.getDescription() != null ? request.getDescription() : "Qo'lda ball ayirish",
                null, userDetails.getUser()
        );
        PointBalance balance = balanceRepository.findByParticipantIdWithParticipant(participantId)
                .orElseThrow(() -> new ResourceNotFoundException("Balans topilmadi"));
        return ResponseEntity.ok(ApiResponse.success(toResponse(balance)));
    }

    private PointBalanceResponse toResponse(PointBalance b) {
        PointBalanceResponse r = new PointBalanceResponse();
        r.setId(b.getId());
        r.setParticipantId(b.getParticipant().getId());
        r.setParticipantName(b.getParticipant().getDisplayName());
        r.setParticipantAvatar(b.getParticipant().getAvatar());
        r.setCurrentBalance(b.getCurrentBalance());
        r.setTotalEarned(b.getTotalEarned());
        r.setTotalSpent(b.getTotalSpent());
        r.setTotalPenalty(b.getTotalPenalty());
        r.setSavingsBalance(b.getSavingsBalance());
        r.setInvestmentBalance(b.getInvestmentBalance());
        r.setCurrentStreak(b.getCurrentStreak());
        r.setLongestStreak(b.getLongestStreak());
        r.setLastTaskCompletedAt(b.getLastTaskCompletedAt());
        r.setInflationMultiplier(b.getInflationMultiplier());
        r.setRealValue(BigDecimal.valueOf(b.getCurrentBalance())
                .multiply(b.getInflationMultiplier())
                .setScale(2, RoundingMode.HALF_UP));
        return r;
    }
}
