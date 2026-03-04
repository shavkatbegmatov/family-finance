package uz.familyfinance.api.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.familyfinance.api.dto.request.PointInvestmentRequest;
import uz.familyfinance.api.dto.response.ApiResponse;
import uz.familyfinance.api.dto.response.PointInvestmentResponse;
import uz.familyfinance.api.enums.PermissionCode;
import uz.familyfinance.api.security.RequiresPermission;
import uz.familyfinance.api.service.PointInvestmentService;

import java.util.List;

@RestController
@RequestMapping("/v1/point-investments")
@RequiredArgsConstructor
public class PointInvestmentController {

    private final PointInvestmentService investmentService;

    @GetMapping("/{participantId}")
    @RequiresPermission(PermissionCode.POINTS_VIEW)
    public ResponseEntity<ApiResponse<List<PointInvestmentResponse>>> getByParticipant(
            @PathVariable Long participantId) {
        return ResponseEntity.ok(ApiResponse.success(investmentService.getByParticipant(participantId)));
    }

    @PostMapping("/{participantId}")
    @RequiresPermission(PermissionCode.POINTS_VIEW)
    public ResponseEntity<ApiResponse<PointInvestmentResponse>> create(
            @PathVariable Long participantId,
            @Valid @RequestBody PointInvestmentRequest request) {
        return ResponseEntity.ok(ApiResponse.success(investmentService.create(participantId, request)));
    }

    @PostMapping("/{id}/sell")
    @RequiresPermission(PermissionCode.POINTS_VIEW)
    public ResponseEntity<ApiResponse<PointInvestmentResponse>> sell(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(investmentService.sell(id)));
    }
}
