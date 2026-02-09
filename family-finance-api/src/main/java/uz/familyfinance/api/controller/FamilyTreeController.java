package uz.familyfinance.api.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.familyfinance.api.dto.request.AddFamilyMemberWithRelationRequest;
import uz.familyfinance.api.dto.request.AddRelationshipRequest;
import uz.familyfinance.api.dto.response.ApiResponse;
import uz.familyfinance.api.dto.response.FamilyTreeResponse;
import uz.familyfinance.api.dto.response.RelationshipTypeDto;
import uz.familyfinance.api.enums.PermissionCode;
import uz.familyfinance.api.security.RequiresPermission;
import uz.familyfinance.api.service.FamilyTreeService;

import jakarta.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/v1/family-tree")
@RequiredArgsConstructor
public class FamilyTreeController {

    private final FamilyTreeService familyTreeService;

    @GetMapping
    @RequiresPermission(PermissionCode.FAMILY_VIEW)
    public ResponseEntity<ApiResponse<FamilyTreeResponse>> getTree(
            @RequestParam(required = false) Long memberId) {
        return ResponseEntity.ok(ApiResponse.success(familyTreeService.getTree(memberId)));
    }

    @PostMapping("/relationships")
    @RequiresPermission(PermissionCode.FAMILY_CREATE)
    public ResponseEntity<ApiResponse<Void>> addRelationship(
            @Valid @RequestBody AddRelationshipRequest request) {
        familyTreeService.addRelationship(request);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PostMapping("/members")
    @RequiresPermission(PermissionCode.FAMILY_CREATE)
    public ResponseEntity<ApiResponse<FamilyTreeResponse>> addMemberWithRelation(
            @Valid @RequestBody AddFamilyMemberWithRelationRequest request) {
        return ResponseEntity.ok(ApiResponse.success(familyTreeService.addMemberWithRelationship(request)));
    }

    @DeleteMapping("/relationships")
    @RequiresPermission(PermissionCode.FAMILY_DELETE)
    public ResponseEntity<ApiResponse<Void>> removeRelationship(
            @RequestParam Long from, @RequestParam Long to) {
        familyTreeService.removeRelationship(from, to);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @GetMapping("/relationship-types")
    @RequiresPermission(PermissionCode.FAMILY_VIEW)
    public ResponseEntity<ApiResponse<List<RelationshipTypeDto>>> getRelationshipTypes() {
        return ResponseEntity.ok(ApiResponse.success(familyTreeService.getRelationshipTypes()));
    }
}
