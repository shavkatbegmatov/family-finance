package uz.familyfinance.api.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.familyfinance.api.dto.request.TransactionRequest;
import uz.familyfinance.api.dto.response.ApiResponse;
import uz.familyfinance.api.dto.response.PagedResponse;
import uz.familyfinance.api.dto.response.TransactionResponse;
import uz.familyfinance.api.enums.TransactionType;
import uz.familyfinance.api.enums.PermissionCode;
import uz.familyfinance.api.security.RequiresPermission;
import uz.familyfinance.api.service.TransactionService;

import jakarta.validation.Valid;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/v1/transactions")
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionService transactionService;

    @GetMapping
    @RequiresPermission(PermissionCode.TRANSACTIONS_VIEW)
    public ResponseEntity<ApiResponse<PagedResponse<TransactionResponse>>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) TransactionType type,
            @RequestParam(required = false) Long accountId,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Long memberId,
            @RequestParam(required = false) LocalDateTime from,
            @RequestParam(required = false) LocalDateTime to) {
        Page<TransactionResponse> result = transactionService.getAll(type, accountId, categoryId, memberId, from, to,
                PageRequest.of(page, size, Sort.by("transactionDate").descending()));
        return ResponseEntity.ok(ApiResponse.success(PagedResponse.of(result)));
    }

    @GetMapping("/recent")
    @RequiresPermission(PermissionCode.TRANSACTIONS_VIEW)
    public ResponseEntity<ApiResponse<List<TransactionResponse>>> getRecent() {
        return ResponseEntity.ok(ApiResponse.success(transactionService.getRecent()));
    }

    @GetMapping("/{id}")
    @RequiresPermission(PermissionCode.TRANSACTIONS_VIEW)
    public ResponseEntity<ApiResponse<TransactionResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(transactionService.getById(id)));
    }

    @PostMapping
    @RequiresPermission(PermissionCode.TRANSACTIONS_CREATE)
    public ResponseEntity<ApiResponse<TransactionResponse>> create(@Valid @RequestBody TransactionRequest request) {
        return ResponseEntity.ok(ApiResponse.success(transactionService.create(request)));
    }

    @PutMapping("/{id}")
    @RequiresPermission(PermissionCode.TRANSACTIONS_UPDATE)
    public ResponseEntity<ApiResponse<TransactionResponse>> update(@PathVariable Long id,
            @Valid @RequestBody TransactionRequest request) {
        return ResponseEntity.ok(ApiResponse.success(transactionService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(PermissionCode.TRANSACTIONS_DELETE)
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        transactionService.delete(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
