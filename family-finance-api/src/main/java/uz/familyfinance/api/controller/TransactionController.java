package uz.familyfinance.api.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.familyfinance.api.dto.request.BulkCategorizeRequest;
import uz.familyfinance.api.dto.request.BulkReverseRequest;
import uz.familyfinance.api.dto.request.ReverseTransactionRequest;
import uz.familyfinance.api.dto.request.TransactionRequest;
import uz.familyfinance.api.dto.response.ApiResponse;
import uz.familyfinance.api.dto.response.BulkOperationResponse;
import uz.familyfinance.api.dto.response.ExpenseSummaryResponse;
import uz.familyfinance.api.dto.response.PagedResponse;
import uz.familyfinance.api.dto.response.TransactionResponse;
import uz.familyfinance.api.enums.TransactionType;
import uz.familyfinance.api.enums.PermissionCode;
import uz.familyfinance.api.exception.BadRequestException;
import uz.familyfinance.api.security.RequiresPermission;
import uz.familyfinance.api.service.TransactionService;

import jakarta.validation.Valid;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/v1/transactions")
@RequiredArgsConstructor
public class TransactionController {

    /** expense-summary uchun ruxsat etilgan maksimal davr (kun bo'yicha GROUP BY hajmini chegaralaydi). */
    private static final int MAX_SUMMARY_RANGE_DAYS = 366;

    private final TransactionService transactionService;

    /**
     * from/to — YYYY-MM-DD (front DateRangePicker shu formatda yuboradi). Avval parametr
     * LocalDateTime edi va sof sana 400 qaytarardi — sana filtri umuman ishlamasdi;
     * ReportController naqshiga o'tkazildi: butun tugash kuni ham davrga kiradi.
     */
    @GetMapping
    @RequiresPermission(PermissionCode.TRANSACTIONS_VIEW)
    public ResponseEntity<ApiResponse<PagedResponse<TransactionResponse>>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) TransactionType type,
            @RequestParam(required = false) Long accountId,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Long memberId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String search) {
        LocalDateTime fromDt = from != null ? from.atStartOfDay() : null;
        LocalDateTime toDt = to != null ? to.atTime(23, 59, 59) : null;
        Page<TransactionResponse> result = transactionService.getAll(type, accountId, categoryId, memberId, fromDt,
                toDt, search, PageRequest.of(page, size, Sort.by("transactionDate").descending()));
        return ResponseEntity.ok(ApiResponse.success(PagedResponse.of(result)));
    }

    @GetMapping("/recent")
    @RequiresPermission(PermissionCode.TRANSACTIONS_VIEW)
    public ResponseEntity<ApiResponse<List<TransactionResponse>>> getRecent() {
        return ResponseEntity.ok(ApiResponse.success(transactionService.getRecent()));
    }

    /** Kunlik xarajatlar jurnali: kun/kategoriya/davr kesimida valyutaga ajratilgan jamlar. */
    @GetMapping("/expense-summary")
    @RequiresPermission(PermissionCode.TRANSACTIONS_VIEW)
    public ResponseEntity<ApiResponse<ExpenseSummaryResponse>> getExpenseSummary(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        if (from.isAfter(to)) {
            throw new BadRequestException("Boshlanish sanasi tugash sanasidan keyin bo'lishi mumkin emas");
        }
        if (from.plusDays(MAX_SUMMARY_RANGE_DAYS).isBefore(to)) {
            throw new BadRequestException("Xulosa davri " + MAX_SUMMARY_RANGE_DAYS + " kundan oshmasligi kerak");
        }
        return ResponseEntity.ok(ApiResponse.success(transactionService.getExpenseSummary(from, to)));
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

    @PostMapping("/{id}/reverse")
    @RequiresPermission(PermissionCode.TRANSACTIONS_REVERSE)
    public ResponseEntity<ApiResponse<TransactionResponse>> reverse(
            @PathVariable Long id,
            @Valid @RequestBody ReverseTransactionRequest request) {
        return ResponseEntity.ok(ApiResponse.success(transactionService.reverse(id, request.getReason())));
    }

    @GetMapping("/account/{accountId}")
    @RequiresPermission(PermissionCode.TRANSACTIONS_VIEW)
    public ResponseEntity<ApiResponse<PagedResponse<TransactionResponse>>> getByAccount(
            @PathVariable Long accountId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Page<TransactionResponse> result = transactionService.getByAccount(accountId,
                PageRequest.of(page, size, Sort.by("transactionDate").descending()));
        return ResponseEntity.ok(ApiResponse.success(PagedResponse.of(result)));
    }

    @PatchMapping("/{id}/confirm")
    @RequiresPermission(PermissionCode.TRANSACTIONS_CONFIRM)
    public ResponseEntity<ApiResponse<TransactionResponse>> confirm(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(transactionService.confirm(id)));
    }

    @PatchMapping("/{id}/cancel")
    @RequiresPermission(PermissionCode.TRANSACTIONS_CANCEL)
    public ResponseEntity<ApiResponse<TransactionResponse>> cancel(
            @PathVariable Long id,
            @RequestBody ReverseTransactionRequest request) {
        return ResponseEntity.ok(ApiResponse.success(transactionService.cancel(id, request.getReason())));
    }

    @PostMapping("/bulk-reverse")
    @RequiresPermission(PermissionCode.TRANSACTIONS_REVERSE)
    public ResponseEntity<ApiResponse<BulkOperationResponse>> bulkReverse(
            @Valid @RequestBody BulkReverseRequest request) {
        return ResponseEntity.ok(ApiResponse.success(transactionService.bulkReverse(request)));
    }

    @PatchMapping("/bulk-categorize")
    @RequiresPermission(PermissionCode.TRANSACTIONS_UPDATE)
    public ResponseEntity<ApiResponse<BulkOperationResponse>> bulkCategorize(
            @Valid @RequestBody BulkCategorizeRequest request) {
        return ResponseEntity.ok(ApiResponse.success(transactionService.bulkCategorize(request)));
    }
}
