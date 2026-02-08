package uz.familyfinance.api.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.familyfinance.api.dto.request.SavingsContributionRequest;
import uz.familyfinance.api.dto.request.SavingsGoalRequest;
import uz.familyfinance.api.dto.response.*;
import uz.familyfinance.api.enums.PermissionCode;
import uz.familyfinance.api.security.RequiresPermission;
import uz.familyfinance.api.service.SavingsGoalService;

import jakarta.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/v1/savings-goals")
@RequiredArgsConstructor
public class SavingsGoalController {

    private final SavingsGoalService savingsGoalService;

    @GetMapping
    @RequiresPermission(PermissionCode.SAVINGS_VIEW)
    public ResponseEntity<ApiResponse<PagedResponse<SavingsGoalResponse>>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<SavingsGoalResponse> result = savingsGoalService.getAll(
                PageRequest.of(page, size, Sort.by("createdAt").descending()));
        return ResponseEntity.ok(ApiResponse.success(PagedResponse.of(result)));
    }

    @GetMapping("/{id}")
    @RequiresPermission(PermissionCode.SAVINGS_VIEW)
    public ResponseEntity<ApiResponse<SavingsGoalResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(savingsGoalService.getById(id)));
    }

    @PostMapping
    @RequiresPermission(PermissionCode.SAVINGS_CREATE)
    public ResponseEntity<ApiResponse<SavingsGoalResponse>> create(@Valid @RequestBody SavingsGoalRequest request) {
        return ResponseEntity.ok(ApiResponse.success(savingsGoalService.create(request)));
    }

    @PutMapping("/{id}")
    @RequiresPermission(PermissionCode.SAVINGS_UPDATE)
    public ResponseEntity<ApiResponse<SavingsGoalResponse>> update(@PathVariable Long id,
            @Valid @RequestBody SavingsGoalRequest request) {
        return ResponseEntity.ok(ApiResponse.success(savingsGoalService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(PermissionCode.SAVINGS_DELETE)
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        savingsGoalService.delete(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PostMapping("/{id}/contributions")
    @RequiresPermission(PermissionCode.SAVINGS_CONTRIBUTE)
    public ResponseEntity<ApiResponse<SavingsContributionResponse>> addContribution(
            @PathVariable Long id, @Valid @RequestBody SavingsContributionRequest request) {
        return ResponseEntity.ok(ApiResponse.success(savingsGoalService.addContribution(id, request)));
    }

    @GetMapping("/{id}/contributions")
    @RequiresPermission(PermissionCode.SAVINGS_VIEW)
    public ResponseEntity<ApiResponse<List<SavingsContributionResponse>>> getContributions(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(savingsGoalService.getContributions(id)));
    }
}
