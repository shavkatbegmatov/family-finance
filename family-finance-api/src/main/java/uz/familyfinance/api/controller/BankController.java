package uz.familyfinance.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import uz.familyfinance.api.dto.request.BankRequest;
import uz.familyfinance.api.dto.response.ApiResponse;
import uz.familyfinance.api.dto.response.BankResponse;
import uz.familyfinance.api.service.BankService;

import java.util.List;

@RestController
@RequestMapping("/api/v1/banks")
@Tag(name = "Banklar", description = "Banklarni boshqarish apilari")
@RequiredArgsConstructor
public class BankController {

    private final BankService bankService;

    @GetMapping
    @Operation(summary = "Barcha banklarni olish (paginatsiya bilan)")
    @PreAuthorize("hasAuthority('PERM_SETTINGS_VIEW')")
    public ApiResponse<Page<BankResponse>> getBanks(
            @RequestParam(required = false) String search,
            Pageable pageable) {
        return ApiResponse.success(bankService.getBanks(search, pageable));
    }

    @GetMapping("/active")
    @Operation(summary = "Barcha faol banklarni ro'yxatini olish (Forma dropdown uchun)")
    public ApiResponse<List<BankResponse>> getActiveBanks() {
        return ApiResponse.success(bankService.getActiveBanks());
    }

    @GetMapping("/{id}")
    @Operation(summary = "ID bo'yicha bankni olish")
    @PreAuthorize("hasAuthority('PERM_SETTINGS_VIEW')")
    public ApiResponse<BankResponse> getBankById(@PathVariable Long id) {
        return ApiResponse.success(bankService.getBankById(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Yangi bank yaratish")
    @PreAuthorize("hasAuthority('PERM_SETTINGS_UPDATE')")
    public ApiResponse<BankResponse> createBank(@Valid @RequestBody BankRequest request) {
        return ApiResponse.success("Bank muvaffaqiyatli yaratildi", bankService.createBank(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Bankni yangilash")
    @PreAuthorize("hasAuthority('PERM_SETTINGS_UPDATE')")
    public ApiResponse<BankResponse> updateBank(@PathVariable Long id, @Valid @RequestBody BankRequest request) {
        return ApiResponse.success("Bank muvaffaqiyatli yangilandi", bankService.updateBank(id, request));
    }

    @GetMapping("/resolve/{cardNumber}")
    @Operation(summary = "Karta raqami (BIN) asosida mos keluvchi Bankni qaytaradi")
    public ApiResponse<BankResponse> resolveBankByCardNumber(@PathVariable String cardNumber) {
        BankResponse resolvedBank = bankService.resolveBankByCardNumber(cardNumber);
        if (resolvedBank != null) {
            return ApiResponse.success(resolvedBank);
        } else {
            return ApiResponse.success(null);
        }
    }
}
