package uz.familyfinance.api.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.familyfinance.api.dto.request.AddChildRequest;
import uz.familyfinance.api.dto.request.AddPartnerRequest;
import uz.familyfinance.api.dto.request.CreateFamilyUnitRequest;
import uz.familyfinance.api.dto.request.UpdateFamilyUnitRequest;
import uz.familyfinance.api.dto.response.ApiResponse;
import uz.familyfinance.api.dto.response.FamilyUnitResponse;
import uz.familyfinance.api.enums.PermissionCode;
import uz.familyfinance.api.security.RequiresPermission;
import uz.familyfinance.api.service.FamilyUnitService;

import java.util.List;

@RestController
@RequestMapping("/v1/family-units")
@RequiredArgsConstructor
public class FamilyUnitController {

    private final FamilyUnitService familyUnitService;

    @PostMapping
    @RequiresPermission(PermissionCode.FAMILY_CREATE)
    public ResponseEntity<ApiResponse<FamilyUnitResponse>> createFamilyUnit(
            @Valid @RequestBody CreateFamilyUnitRequest request) {
        return ResponseEntity.ok(ApiResponse.success(familyUnitService.createFamilyUnit(request)));
    }

    @GetMapping("/{id}")
    @RequiresPermission(PermissionCode.FAMILY_VIEW)
    public ResponseEntity<ApiResponse<FamilyUnitResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(familyUnitService.getById(id)));
    }

    @PutMapping("/{id}")
    @RequiresPermission(PermissionCode.FAMILY_UPDATE)
    public ResponseEntity<ApiResponse<FamilyUnitResponse>> updateFamilyUnit(
            @PathVariable Long id, @Valid @RequestBody UpdateFamilyUnitRequest request) {
        return ResponseEntity.ok(ApiResponse.success(familyUnitService.updateFamilyUnit(id, request)));
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(PermissionCode.FAMILY_DELETE)
    public ResponseEntity<ApiResponse<Void>> deleteFamilyUnit(@PathVariable Long id) {
        familyUnitService.deleteFamilyUnit(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PostMapping("/{id}/partners")
    @RequiresPermission(PermissionCode.FAMILY_CREATE)
    public ResponseEntity<ApiResponse<FamilyUnitResponse>> addPartner(
            @PathVariable Long id, @Valid @RequestBody AddPartnerRequest request) {
        return ResponseEntity.ok(ApiResponse.success(familyUnitService.addPartner(id, request)));
    }

    @DeleteMapping("/{id}/partners/{personId}")
    @RequiresPermission(PermissionCode.FAMILY_DELETE)
    public ResponseEntity<ApiResponse<FamilyUnitResponse>> removePartner(
            @PathVariable Long id, @PathVariable Long personId) {
        return ResponseEntity.ok(ApiResponse.success(familyUnitService.removePartner(id, personId)));
    }

    @PostMapping("/{id}/children")
    @RequiresPermission(PermissionCode.FAMILY_CREATE)
    public ResponseEntity<ApiResponse<FamilyUnitResponse>> addChild(
            @PathVariable Long id, @Valid @RequestBody AddChildRequest request) {
        return ResponseEntity.ok(ApiResponse.success(familyUnitService.addChild(id, request)));
    }

    @DeleteMapping("/{id}/children/{personId}")
    @RequiresPermission(PermissionCode.FAMILY_DELETE)
    public ResponseEntity<ApiResponse<FamilyUnitResponse>> removeChild(
            @PathVariable Long id, @PathVariable Long personId) {
        return ResponseEntity.ok(ApiResponse.success(familyUnitService.removeChild(id, personId)));
    }

    @GetMapping("/by-person/{personId}")
    @RequiresPermission(PermissionCode.FAMILY_VIEW)
    public ResponseEntity<ApiResponse<List<FamilyUnitResponse>>> getByPerson(@PathVariable Long personId) {
        return ResponseEntity.ok(ApiResponse.success(familyUnitService.getByPersonId(personId)));
    }
}
