package uz.familyfinance.api.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import uz.familyfinance.api.dto.request.AccountAccessRequest;
import uz.familyfinance.api.dto.request.AccountRequest;
import uz.familyfinance.api.dto.request.CardRequest;
import uz.familyfinance.api.dto.response.AccountAccessResponse;
import uz.familyfinance.api.dto.response.AccountBalanceSummaryResponse;
import uz.familyfinance.api.dto.response.AccountResponse;
import uz.familyfinance.api.dto.response.ApiResponse;
import uz.familyfinance.api.dto.response.CardResponse;
import uz.familyfinance.api.dto.response.PagedResponse;
import uz.familyfinance.api.enums.AccountStatus;
import uz.familyfinance.api.enums.AccountType;
import uz.familyfinance.api.enums.PermissionCode;
import uz.familyfinance.api.security.CustomUserDetails;
import uz.familyfinance.api.security.RequiresPermission;
import uz.familyfinance.api.service.AccountAccessService;
import uz.familyfinance.api.service.AccountService;
import uz.familyfinance.api.service.CardService;

import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/v1/accounts")
@RequiredArgsConstructor
public class AccountController {

    private final AccountService accountService;
    private final CardService cardService;
    private final AccountAccessService accountAccessService;

    @GetMapping
    @RequiresPermission(PermissionCode.ACCOUNTS_VIEW)
    public ResponseEntity<ApiResponse<PagedResponse<AccountResponse>>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) AccountType accountType,
            @RequestParam(required = false) AccountStatus status,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        Page<AccountResponse> result = accountService.getAll(search, accountType, status,
                PageRequest.of(page, size, Sort.by("createdAt").descending()), userDetails);
        return ResponseEntity.ok(ApiResponse.success(PagedResponse.of(result)));
    }

    @GetMapping("/my")
    @RequiresPermission(PermissionCode.ACCOUNTS_VIEW)
    public ResponseEntity<ApiResponse<PagedResponse<AccountResponse>>> getMyAccounts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        Page<AccountResponse> result = accountService.getMyAccounts(userDetails.getUser().getId(),
                PageRequest.of(page, size, Sort.by("createdAt").descending()));
        return ResponseEntity.ok(ApiResponse.success(PagedResponse.of(result)));
    }

    @PatchMapping("/{id}/status")
    @RequiresPermission(PermissionCode.ACCOUNTS_UPDATE)
    public ResponseEntity<ApiResponse<AccountResponse>> changeStatus(
            @PathVariable Long id,
            @RequestParam AccountStatus status,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(accountService.changeStatus(id, status, userDetails)));
    }

    @GetMapping("/{id}/balance-summary")
    @RequiresPermission(PermissionCode.ACCOUNTS_VIEW)
    public ResponseEntity<ApiResponse<AccountBalanceSummaryResponse>> getBalanceSummary(
            @PathVariable Long id,
            @RequestParam(required = false) LocalDate dateFrom,
            @RequestParam(required = false) LocalDate dateTo,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                accountService.getBalanceSummary(id, dateFrom, dateTo, userDetails)));
    }

    @GetMapping("/list")
    @RequiresPermission(PermissionCode.ACCOUNTS_VIEW)
    public ResponseEntity<ApiResponse<List<AccountResponse>>> getAllActive(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(accountService.getAllActive(userDetails)));
    }

    @GetMapping("/total-balance")
    @RequiresPermission(PermissionCode.ACCOUNTS_VIEW)
    public ResponseEntity<ApiResponse<BigDecimal>> getTotalBalance() {
        return ResponseEntity.ok(ApiResponse.success(accountService.getTotalBalance()));
    }

    @GetMapping("/{id}")
    @RequiresPermission(PermissionCode.ACCOUNTS_VIEW)
    public ResponseEntity<ApiResponse<AccountResponse>> getById(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(accountService.getById(id, userDetails)));
    }

    @GetMapping("/by-code/{accCode}")
    @RequiresPermission(PermissionCode.ACCOUNTS_VIEW)
    public ResponseEntity<ApiResponse<AccountResponse>> getByAccCode(
            @PathVariable String accCode,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(accountService.getByAccCode(accCode, userDetails)));
    }

    @PostMapping
    @RequiresPermission(PermissionCode.ACCOUNTS_CREATE)
    public ResponseEntity<ApiResponse<AccountResponse>> create(
            @Valid @RequestBody AccountRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(accountService.create(request, userDetails)));
    }

    @PutMapping("/{id}")
    @RequiresPermission(PermissionCode.ACCOUNTS_UPDATE)
    public ResponseEntity<ApiResponse<AccountResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody AccountRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(accountService.update(id, request, userDetails)));
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(PermissionCode.ACCOUNTS_DELETE)
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        accountService.delete(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // Cards endpoints

    @GetMapping("/{id}/cards")
    @RequiresPermission(PermissionCode.CARDS_VIEW)
    public ResponseEntity<ApiResponse<List<CardResponse>>> getCards(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(cardService.getCardsByAccount(id)));
    }

    @PostMapping("/{id}/cards")
    @RequiresPermission(PermissionCode.CARDS_CREATE)
    public ResponseEntity<ApiResponse<CardResponse>> addCard(@PathVariable Long id, @Valid @RequestBody CardRequest request) {
        return ResponseEntity.ok(ApiResponse.success(cardService.addCard(id, request)));
    }

    // Access endpoints

    @GetMapping("/{id}/access")
    @RequiresPermission(PermissionCode.ACCOUNTS_VIEW)
    public ResponseEntity<ApiResponse<List<AccountAccessResponse>>> getAccess(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(accountAccessService.getAccessList(id)));
    }

    @PostMapping("/{id}/access")
    @RequiresPermission(PermissionCode.ACCOUNTS_ACCESS_MANAGE)
    public ResponseEntity<ApiResponse<AccountAccessResponse>> grantAccess(
            @PathVariable Long id, @Valid @RequestBody AccountAccessRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                accountAccessService.grantAccess(id, request, userDetails)));
    }

    @DeleteMapping("/{id}/access/{userId}")
    @RequiresPermission(PermissionCode.ACCOUNTS_ACCESS_MANAGE)
    public ResponseEntity<ApiResponse<Void>> revokeAccess(
            @PathVariable Long id, @PathVariable Long userId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        accountAccessService.revokeAccess(id, userId, userDetails);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
