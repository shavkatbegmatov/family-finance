package uz.familyfinance.api.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.familyfinance.api.dto.request.DebtPaymentRequest;
import uz.familyfinance.api.dto.request.DebtRequest;
import uz.familyfinance.api.dto.response.*;
import uz.familyfinance.api.enums.DebtStatus;
import uz.familyfinance.api.enums.DebtType;
import uz.familyfinance.api.enums.PermissionCode;
import uz.familyfinance.api.security.RequiresPermission;
import uz.familyfinance.api.service.DebtService;

import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/debts")
@RequiredArgsConstructor
public class DebtController {

    private final DebtService debtService;

    @GetMapping
    @RequiresPermission(PermissionCode.DEBTS_VIEW)
    public ResponseEntity<ApiResponse<PagedResponse<DebtResponse>>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) DebtType type,
            @RequestParam(required = false) DebtStatus status,
            @RequestParam(required = false) String search) {
        Page<DebtResponse> result = debtService.getAll(type, status, search,
                PageRequest.of(page, size, Sort.by("createdAt").descending()));
        return ResponseEntity.ok(ApiResponse.success(PagedResponse.of(result)));
    }

    @GetMapping("/summary")
    @RequiresPermission(PermissionCode.DEBTS_VIEW)
    public ResponseEntity<ApiResponse<Map<String, BigDecimal>>> getSummary() {
        return ResponseEntity.ok(ApiResponse.success(Map.of(
                "totalGiven", debtService.getTotalGiven(),
                "totalTaken", debtService.getTotalTaken()
        )));
    }

    @GetMapping("/{id}")
    @RequiresPermission(PermissionCode.DEBTS_VIEW)
    public ResponseEntity<ApiResponse<DebtResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(debtService.getById(id)));
    }

    @PostMapping
    @RequiresPermission(PermissionCode.DEBTS_CREATE)
    public ResponseEntity<ApiResponse<DebtResponse>> create(@Valid @RequestBody DebtRequest request) {
        return ResponseEntity.ok(ApiResponse.success(debtService.create(request)));
    }

    @PutMapping("/{id}")
    @RequiresPermission(PermissionCode.DEBTS_UPDATE)
    public ResponseEntity<ApiResponse<DebtResponse>> update(@PathVariable Long id,
            @Valid @RequestBody DebtRequest request) {
        return ResponseEntity.ok(ApiResponse.success(debtService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(PermissionCode.DEBTS_DELETE)
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        debtService.delete(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PostMapping("/{id}/payments")
    @RequiresPermission(PermissionCode.DEBTS_PAY)
    public ResponseEntity<ApiResponse<DebtPaymentResponse>> addPayment(
            @PathVariable Long id, @Valid @RequestBody DebtPaymentRequest request) {
        return ResponseEntity.ok(ApiResponse.success(debtService.addPayment(id, request)));
    }

    @GetMapping("/{id}/payments")
    @RequiresPermission(PermissionCode.DEBTS_VIEW)
    public ResponseEntity<ApiResponse<List<DebtPaymentResponse>>> getPayments(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(debtService.getPayments(id)));
    }
}
