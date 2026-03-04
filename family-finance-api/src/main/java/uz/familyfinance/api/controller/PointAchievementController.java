package uz.familyfinance.api.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.familyfinance.api.dto.request.PointAchievementRequest;
import uz.familyfinance.api.dto.response.ApiResponse;
import uz.familyfinance.api.dto.response.PointAchievementResponse;
import uz.familyfinance.api.enums.PermissionCode;
import uz.familyfinance.api.security.RequiresPermission;
import uz.familyfinance.api.service.PointAchievementService;

import java.util.List;

@RestController
@RequestMapping("/v1/point-achievements")
@RequiredArgsConstructor
public class PointAchievementController {

    private final PointAchievementService achievementService;

    @GetMapping
    @RequiresPermission(PermissionCode.POINTS_VIEW)
    public ResponseEntity<ApiResponse<List<PointAchievementResponse>>> getAll() {
        return ResponseEntity.ok(ApiResponse.success(achievementService.getAll()));
    }

    @GetMapping("/{participantId}/earned")
    @RequiresPermission(PermissionCode.POINTS_VIEW)
    public ResponseEntity<ApiResponse<List<PointAchievementResponse>>> getEarned(
            @PathVariable Long participantId) {
        return ResponseEntity.ok(ApiResponse.success(achievementService.getEarnedByParticipant(participantId)));
    }

    @PostMapping
    @RequiresPermission(PermissionCode.POINTS_MANAGE_ACHIEVEMENTS)
    public ResponseEntity<ApiResponse<PointAchievementResponse>> create(
            @Valid @RequestBody PointAchievementRequest request) {
        return ResponseEntity.ok(ApiResponse.success(achievementService.create(request)));
    }

    @PutMapping("/{id}")
    @RequiresPermission(PermissionCode.POINTS_MANAGE_ACHIEVEMENTS)
    public ResponseEntity<ApiResponse<PointAchievementResponse>> update(
            @PathVariable Long id, @Valid @RequestBody PointAchievementRequest request) {
        return ResponseEntity.ok(ApiResponse.success(achievementService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(PermissionCode.POINTS_MANAGE_ACHIEVEMENTS)
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        achievementService.delete(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
