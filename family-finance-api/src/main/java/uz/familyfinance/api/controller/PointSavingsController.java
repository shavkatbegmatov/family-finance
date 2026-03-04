package uz.familyfinance.api.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.familyfinance.api.dto.request.PointSavingsRequest;
import uz.familyfinance.api.dto.response.ApiResponse;
import uz.familyfinance.api.dto.response.PointSavingsAccountResponse;
import uz.familyfinance.api.enums.PermissionCode;
import uz.familyfinance.api.security.RequiresPermission;
import uz.familyfinance.api.service.PointSavingsService;

@RestController
@RequestMapping("/v1/point-savings")
@RequiredArgsConstructor
public class PointSavingsController {

    private final PointSavingsService savingsService;

    @GetMapping("/{participantId}")
    @RequiresPermission(PermissionCode.POINTS_VIEW)
    public ResponseEntity<ApiResponse<PointSavingsAccountResponse>> get(
            @PathVariable Long participantId) {
        return ResponseEntity.ok(ApiResponse.success(savingsService.getByParticipant(participantId)));
    }

    @PostMapping("/{participantId}/deposit")
    @RequiresPermission(PermissionCode.POINTS_VIEW)
    public ResponseEntity<ApiResponse<PointSavingsAccountResponse>> deposit(
            @PathVariable Long participantId,
            @Valid @RequestBody PointSavingsRequest request) {
        return ResponseEntity.ok(ApiResponse.success(savingsService.deposit(participantId, request.getAmount())));
    }

    @PostMapping("/{participantId}/withdraw")
    @RequiresPermission(PermissionCode.POINTS_VIEW)
    public ResponseEntity<ApiResponse<PointSavingsAccountResponse>> withdraw(
            @PathVariable Long participantId,
            @Valid @RequestBody PointSavingsRequest request) {
        return ResponseEntity.ok(ApiResponse.success(savingsService.withdraw(participantId, request.getAmount())));
    }
}
