package uz.familyfinance.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import uz.familyfinance.api.dto.familygroup.FamilyGroupAddMemberRequest;
import uz.familyfinance.api.dto.familygroup.FamilyGroupResponse;
import uz.familyfinance.api.dto.response.ApiResponse;
import uz.familyfinance.api.dto.response.HouseholdDashboardResponse;
import uz.familyfinance.api.enums.PermissionCode;
import uz.familyfinance.api.security.CustomUserDetails;
import uz.familyfinance.api.security.RequiresPermission;
import uz.familyfinance.api.service.FamilyGroupService;

@RestController
@RequestMapping("/v1/family-groups")
@RequiredArgsConstructor
@Tag(name = "Family Groups", description = "Oila guruhlarini boshqarish API lari")
public class FamilyGroupController {

    private final FamilyGroupService familyGroupService;

    @GetMapping("/my")
    @Operation(summary = "Mening oila guruhimni olish", description = "Tizimga kirgan foydalanuvchining oila guruhini (va a'zolarini) qaytaradi")
    public ResponseEntity<ApiResponse<FamilyGroupResponse>> getMyFamilyGroup(
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        return ResponseEntity.ok(ApiResponse.success(familyGroupService.getMyFamilyGroup(currentUser.getId())));
    }

    @PostMapping("/members")
    @Operation(summary = "Oilaga a'zo qo'shish", description = "Foydalanuvchi logini (username) orqali uni oilaga qo'shish")
    public ResponseEntity<ApiResponse<Void>> addMember(
            @AuthenticationPrincipal CustomUserDetails currentUser,
            @RequestBody @Valid FamilyGroupAddMemberRequest request) {
        familyGroupService.addMember(currentUser.getId(), request.getUsername());
        return ResponseEntity.ok(ApiResponse.success("A'zo muvaffaqiyatli qo'shildi"));
    }

    @DeleteMapping("/members/{memberId}")
    @Operation(summary = "Oiladan a'zoni o'chirish", description = "Foydalanuvchini oila guruhidan o'chirish")
    public ResponseEntity<ApiResponse<Void>> removeMember(
            @AuthenticationPrincipal CustomUserDetails currentUser,
            @PathVariable Long memberId) {
        familyGroupService.removeMember(currentUser.getId(), memberId);
        return ResponseEntity.ok(ApiResponse.success("A'zo guruhdan chiqarildi"));
    }

    @GetMapping("/my/dashboard")
    @Operation(summary = "Xonadon dashboard", description = "Oila guruhining to'liq dashboard ma'lumotlarini qaytaradi")
    @RequiresPermission(PermissionCode.FAMILY_VIEW)
    public ResponseEntity<ApiResponse<HouseholdDashboardResponse>> getHouseholdDashboard(
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        return ResponseEntity.ok(ApiResponse.success(familyGroupService.getHouseholdDashboard(currentUser)));
    }

    @PostMapping("/address")
    @Operation(summary = "Yangi manzil kiritish/ko'chish", description = "Xo'jalik manzilini qo'shish yoki ko'chgan manzilni o'zgartirish")
    @RequiresPermission(PermissionCode.FAMILY_UPDATE)
    public ResponseEntity<ApiResponse<Void>> changeAddress(
            @AuthenticationPrincipal CustomUserDetails currentUser,
            @RequestBody @Valid uz.familyfinance.api.dto.familygroup.FamilyAddressRequest request) {
        familyGroupService.changeAddress(currentUser.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Manzil muvaffaqiyatli saqlandi"));
    }

    @GetMapping("/address-history")
    @Operation(summary = "Manzillar tarixi", description = "Xo'jalik ro'yxatdan o'tgan barcha manzillarni ko'rish")
    @RequiresPermission(PermissionCode.FAMILY_VIEW)
    public ResponseEntity<ApiResponse<java.util.List<uz.familyfinance.api.dto.familygroup.FamilyAddressHistoryDto>>> getAddressHistory(
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        return ResponseEntity.ok(ApiResponse.success(familyGroupService.getAddressHistory(currentUser.getId())));
    }
}
