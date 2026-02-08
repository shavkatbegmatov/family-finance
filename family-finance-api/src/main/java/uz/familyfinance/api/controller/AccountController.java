package uz.familyfinance.api.controller;

import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.familyfinance.api.dto.request.AccountRequest;
import uz.familyfinance.api.dto.response.AccountResponse;
import uz.familyfinance.api.dto.response.ApiResponse;
import uz.familyfinance.api.dto.response.PagedResponse;
import uz.familyfinance.api.enums.PermissionCode;
import uz.familyfinance.api.security.RequiresPermission;
import uz.familyfinance.api.service.AccountService;

import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/v1/accounts")
@RequiredArgsConstructor
public class AccountController {

    private final AccountService accountService;

    @GetMapping
    @RequiresPermission(PermissionCode.ACCOUNTS_VIEW)
    public ResponseEntity<ApiResponse<PagedResponse<AccountResponse>>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search) {
        Page<AccountResponse> result = accountService.getAll(search,
                PageRequest.of(page, size, Sort.by("createdAt").descending()));
        return ResponseEntity.ok(ApiResponse.success(PagedResponse.of(result)));
    }

    @GetMapping("/list")
    @RequiresPermission(PermissionCode.ACCOUNTS_VIEW)
    public ResponseEntity<ApiResponse<List<AccountResponse>>> getAllActive() {
        return ResponseEntity.ok(ApiResponse.success(accountService.getAllActive()));
    }

    @GetMapping("/total-balance")
    @RequiresPermission(PermissionCode.ACCOUNTS_VIEW)
    public ResponseEntity<ApiResponse<BigDecimal>> getTotalBalance() {
        return ResponseEntity.ok(ApiResponse.success(accountService.getTotalBalance()));
    }

    @GetMapping("/{id}")
    @RequiresPermission(PermissionCode.ACCOUNTS_VIEW)
    public ResponseEntity<ApiResponse<AccountResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(accountService.getById(id)));
    }

    @PostMapping
    @RequiresPermission(PermissionCode.ACCOUNTS_CREATE)
    public ResponseEntity<ApiResponse<AccountResponse>> create(@Valid @RequestBody AccountRequest request) {
        return ResponseEntity.ok(ApiResponse.success(accountService.create(request)));
    }

    @PutMapping("/{id}")
    @RequiresPermission(PermissionCode.ACCOUNTS_UPDATE)
    public ResponseEntity<ApiResponse<AccountResponse>> update(@PathVariable Long id,
            @Valid @RequestBody AccountRequest request) {
        return ResponseEntity.ok(ApiResponse.success(accountService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(PermissionCode.ACCOUNTS_DELETE)
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        accountService.delete(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
