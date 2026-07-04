package uz.familyfinance.api.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.familyfinance.api.dto.request.MembershipInviteRequest;
import uz.familyfinance.api.dto.request.ScopeCreateRequest;
import uz.familyfinance.api.dto.request.ScopeRoleUpdateRequest;
import uz.familyfinance.api.dto.request.SetScopeParentRequest;
import uz.familyfinance.api.dto.response.ApiResponse;
import uz.familyfinance.api.dto.response.FinancialOverviewResponse;
import uz.familyfinance.api.dto.response.MembershipResponse;
import uz.familyfinance.api.dto.response.ScopeResponse;
import uz.familyfinance.api.security.RequiresSuperAdmin;
import uz.familyfinance.api.service.AdminOverviewService;
import uz.familyfinance.api.service.MembershipService;
import uz.familyfinance.api.service.ScopeService;

import java.util.List;

/**
 * Multi-level scope va membership boshqaruvi uchun REST endpoint'lar.
 *
 * <p>Ko'pchilik amallar uchun ruxsatlar service ichida {@code ScopeContextService}
 * orqali tekshiriladi (scope-aware). Shuning uchun bu controller'da
 * {@code @RequiresPermission} kerak emas — har bir scope'ning OWNER/ADMIN'i
 * o'z scope'ini boshqara oladi.</p>
 */
@RestController
@RequestMapping("/v1/scopes")
@RequiredArgsConstructor
public class ScopeController {

    private final ScopeService scopeService;
    private final MembershipService membershipService;
    private final AdminOverviewService adminOverviewService;

    // ===== Scope CRUD =====

    /** Joriy user a'zo bo'lgan barcha scope'lar (ScopeSwitcher uchun). */
    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<ScopeResponse>>> getMyScopes() {
        return ResponseEntity.ok(ApiResponse.success(scopeService.getMyScopes()));
    }

    /** SUPER_ADMIN — platformadagi barcha scope'lar (oilalar nazorati). */
    @GetMapping("/all")
    @RequiresSuperAdmin
    public ResponseEntity<ApiResponse<List<ScopeResponse>>> getAllScopes() {
        return ResponseEntity.ok(ApiResponse.success(scopeService.getAllScopes()));
    }

    /** SUPER_ADMIN — tanlangan oilaning READ-ONLY moliyaviy ko'rinishi (drill-down). */
    @GetMapping("/{id}/financial-overview")
    @RequiresSuperAdmin
    public ResponseEntity<ApiResponse<FinancialOverviewResponse>> getFinancialOverview(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(adminOverviewService.getForScope(id)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ScopeResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(scopeService.getById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ScopeResponse>> create(
            @Valid @RequestBody ScopeCreateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(scopeService.create(request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deactivate(@PathVariable Long id) {
        scopeService.deactivate(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    /**
     * Xonadonni guruhga biriktirish yoki uzish (ADR-001 decoupling UX).
     * Body: {@code {parentScopeId: <groupId>}} — biriktirish; {@code {parentScopeId: null}} — uzish.
     */
    @PutMapping("/{id}/parent")
    public ResponseEntity<ApiResponse<ScopeResponse>> setParent(
            @PathVariable Long id, @RequestBody SetScopeParentRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                scopeService.setHouseholdParent(id, request.getParentScopeId())));
    }

    // ===== Invite codes =====

    /** Joriy scope egasi/admin'i o'z taklif kodini ko'rishi. */
    @GetMapping("/{id}/invite-code")
    public ResponseEntity<ApiResponse<java.util.Map<String, String>>> getInviteCode(
            @PathVariable Long id) {
        String code = scopeService.getInviteCode(id);
        return ResponseEntity.ok(ApiResponse.success(java.util.Map.of("inviteCode", code)));
    }

    /** Eski kodni bekor qilib, yangi unique kod yaratish. */
    @PostMapping("/{id}/invite-code/regenerate")
    public ResponseEntity<ApiResponse<java.util.Map<String, String>>> regenerateInviteCode(
            @PathVariable Long id) {
        String code = scopeService.regenerateInviteCode(id);
        return ResponseEntity.ok(ApiResponse.success(java.util.Map.of("inviteCode", code)));
    }

    /** Login qilmagan user uchun ham — kod bo'yicha ma'lumot ko'rish (nom + turi). */
    @GetMapping("/lookup")
    public ResponseEntity<ApiResponse<ScopeResponse>> lookupByCode(
            @RequestParam("code") String code) {
        return ResponseEntity.ok(ApiResponse.success(scopeService.lookupByCode(code)));
    }

    // ===== Memberships =====

    @GetMapping("/{id}/memberships")
    public ResponseEntity<ApiResponse<List<MembershipResponse>>> listMemberships(
            @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(membershipService.listForScope(id)));
    }

    @PostMapping("/{id}/memberships")
    public ResponseEntity<ApiResponse<MembershipResponse>> invite(
            @PathVariable Long id, @Valid @RequestBody MembershipInviteRequest request) {
        return ResponseEntity.ok(ApiResponse.success(membershipService.invite(id, request)));
    }

    @PutMapping("/{id}/memberships/{userId}")
    public ResponseEntity<ApiResponse<MembershipResponse>> updateRole(
            @PathVariable Long id,
            @PathVariable Long userId,
            @Valid @RequestBody ScopeRoleUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                membershipService.updateRole(id, userId, request)));
    }

    @DeleteMapping("/{id}/memberships/{userId}")
    public ResponseEntity<ApiResponse<Void>> removeMembership(
            @PathVariable Long id, @PathVariable Long userId) {
        membershipService.remove(id, userId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // ===== Pending invitations + accept/decline =====

    /** Joriy user uchun barcha kutilayotgan oila takliflari. */
    @GetMapping("/invitations/pending")
    public ResponseEntity<ApiResponse<List<MembershipResponse>>> myPendingInvitations() {
        return ResponseEntity.ok(ApiResponse.success(membershipService.myPendingInvitations()));
    }

    /** Taklifni qabul qilish. */
    @PostMapping("/invitations/{membershipId}/accept")
    public ResponseEntity<ApiResponse<MembershipResponse>> acceptInvitation(
            @PathVariable Long membershipId) {
        return ResponseEntity.ok(ApiResponse.success(
                membershipService.acceptInvitation(membershipId)));
    }

    /** Taklifni rad etish. */
    @PostMapping("/invitations/{membershipId}/decline")
    public ResponseEntity<ApiResponse<Void>> declineInvitation(
            @PathVariable Long membershipId) {
        membershipService.declineInvitation(membershipId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    /** Joriy user scope'dan o'zi chiqishi. */
    @PostMapping("/{id}/leave")
    public ResponseEntity<ApiResponse<Void>> leaveScope(@PathVariable Long id) {
        membershipService.leaveScope(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    /**
     * Login qilingan user invite code orqali boshqa oilaga qo'shilishi.
     * archiveOldClan=true bo'lsa, eski auto-yaratilgan bo'sh clan arxivlanadi.
     */
    @PostMapping("/join-by-code")
    public ResponseEntity<ApiResponse<MembershipResponse>> joinByCode(
            @RequestBody java.util.Map<String, Object> body) {
        String code = (String) body.get("inviteCode");
        boolean archive = body.get("archiveOldClan") instanceof Boolean b ? b : false;
        return ResponseEntity.ok(ApiResponse.success(
                membershipService.joinByCode(code, archive)));
    }
}
