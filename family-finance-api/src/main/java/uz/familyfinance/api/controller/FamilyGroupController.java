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
import uz.familyfinance.api.security.CustomUserDetails;
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
}
