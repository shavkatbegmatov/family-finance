package uz.familyfinance.api.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.familyfinance.api.dto.request.BudgetRequest;
import uz.familyfinance.api.dto.response.ApiResponse;
import uz.familyfinance.api.dto.response.BudgetResponse;
import uz.familyfinance.api.dto.response.PagedResponse;
import uz.familyfinance.api.enums.PermissionCode;
import uz.familyfinance.api.security.RequiresPermission;
import uz.familyfinance.api.service.BudgetService;

import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/v1/budgets")
@RequiredArgsConstructor
public class BudgetController {

    private final BudgetService budgetService;

    @GetMapping
    @RequiresPermission(PermissionCode.BUDGETS_VIEW)
    public ResponseEntity<ApiResponse<PagedResponse<BudgetResponse>>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<BudgetResponse> result = budgetService.getAll(
                PageRequest.of(page, size, Sort.by("startDate").descending()));
        return ResponseEntity.ok(ApiResponse.success(PagedResponse.of(result)));
    }

    @GetMapping("/active")
    @RequiresPermission(PermissionCode.BUDGETS_VIEW)
    public ResponseEntity<ApiResponse<List<BudgetResponse>>> getActive(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(ApiResponse.success(
                budgetService.getActiveByDate(date != null ? date : LocalDate.now())));
    }

    @GetMapping("/{id}")
    @RequiresPermission(PermissionCode.BUDGETS_VIEW)
    public ResponseEntity<ApiResponse<BudgetResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(budgetService.getById(id)));
    }

    @PostMapping
    @RequiresPermission(PermissionCode.BUDGETS_CREATE)
    public ResponseEntity<ApiResponse<BudgetResponse>> create(@Valid @RequestBody BudgetRequest request) {
        return ResponseEntity.ok(ApiResponse.success(budgetService.create(request)));
    }

    @PutMapping("/{id}")
    @RequiresPermission(PermissionCode.BUDGETS_UPDATE)
    public ResponseEntity<ApiResponse<BudgetResponse>> update(@PathVariable Long id,
            @Valid @RequestBody BudgetRequest request) {
        return ResponseEntity.ok(ApiResponse.success(budgetService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(PermissionCode.BUDGETS_DELETE)
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        budgetService.delete(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
