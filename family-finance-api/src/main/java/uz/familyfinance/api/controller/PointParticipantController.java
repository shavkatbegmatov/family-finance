package uz.familyfinance.api.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.familyfinance.api.dto.request.PointParticipantRequest;
import uz.familyfinance.api.dto.response.*;
import uz.familyfinance.api.enums.PermissionCode;
import uz.familyfinance.api.security.RequiresPermission;
import uz.familyfinance.api.service.PointParticipantService;

import java.util.List;

@RestController
@RequestMapping("/v1/point-participants")
@RequiredArgsConstructor
public class PointParticipantController {

    private final PointParticipantService participantService;

    @GetMapping
    @RequiresPermission(PermissionCode.POINTS_VIEW)
    public ResponseEntity<ApiResponse<List<PointParticipantResponse>>> getAll() {
        return ResponseEntity.ok(ApiResponse.success(participantService.getAll()));
    }

    @GetMapping("/paged")
    @RequiresPermission(PermissionCode.POINTS_VIEW)
    public ResponseEntity<ApiResponse<PagedResponse<PointParticipantResponse>>> getAllPaged(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<PointParticipantResponse> result = participantService.getAllPaged(
                PageRequest.of(page, size, Sort.by("createdAt").descending()));
        return ResponseEntity.ok(ApiResponse.success(PagedResponse.of(result)));
    }

    @GetMapping("/{id}")
    @RequiresPermission(PermissionCode.POINTS_VIEW)
    public ResponseEntity<ApiResponse<PointParticipantResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(participantService.getById(id)));
    }

    @PostMapping
    @RequiresPermission(PermissionCode.POINTS_MANAGE)
    public ResponseEntity<ApiResponse<PointParticipantResponse>> create(
            @Valid @RequestBody PointParticipantRequest request) {
        return ResponseEntity.ok(ApiResponse.success(participantService.create(request)));
    }

    @PutMapping("/{id}")
    @RequiresPermission(PermissionCode.POINTS_MANAGE)
    public ResponseEntity<ApiResponse<PointParticipantResponse>> update(
            @PathVariable Long id, @Valid @RequestBody PointParticipantRequest request) {
        return ResponseEntity.ok(ApiResponse.success(participantService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(PermissionCode.POINTS_MANAGE)
    public ResponseEntity<ApiResponse<Void>> deactivate(@PathVariable Long id) {
        participantService.deactivate(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PostMapping("/{id}/link-member")
    @RequiresPermission(PermissionCode.POINTS_MANAGE)
    public ResponseEntity<ApiResponse<PointParticipantResponse>> linkMember(
            @PathVariable Long id, @RequestParam Long familyMemberId) {
        return ResponseEntity.ok(ApiResponse.success(participantService.linkMember(id, familyMemberId)));
    }
}
