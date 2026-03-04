package uz.familyfinance.api.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.familyfinance.api.dto.request.PointChallengeRequest;
import uz.familyfinance.api.dto.response.ApiResponse;
import uz.familyfinance.api.dto.response.PointChallengeResponse;
import uz.familyfinance.api.enums.PermissionCode;
import uz.familyfinance.api.security.RequiresPermission;
import uz.familyfinance.api.service.PointChallengeService;

import java.util.List;

@RestController
@RequestMapping("/v1/point-challenges")
@RequiredArgsConstructor
public class PointChallengeController {

    private final PointChallengeService challengeService;

    @GetMapping
    @RequiresPermission(PermissionCode.POINTS_VIEW)
    public ResponseEntity<ApiResponse<List<PointChallengeResponse>>> getAll() {
        return ResponseEntity.ok(ApiResponse.success(challengeService.getAll()));
    }

    @GetMapping("/active")
    @RequiresPermission(PermissionCode.POINTS_VIEW)
    public ResponseEntity<ApiResponse<List<PointChallengeResponse>>> getActive() {
        return ResponseEntity.ok(ApiResponse.success(challengeService.getActive()));
    }

    @GetMapping("/{id}/results")
    @RequiresPermission(PermissionCode.POINTS_VIEW)
    public ResponseEntity<ApiResponse<PointChallengeResponse>> getResults(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(challengeService.getResults(id)));
    }

    @PostMapping
    @RequiresPermission(PermissionCode.POINTS_MANAGE_CHALLENGES)
    public ResponseEntity<ApiResponse<PointChallengeResponse>> create(
            @Valid @RequestBody PointChallengeRequest request) {
        return ResponseEntity.ok(ApiResponse.success(challengeService.create(request)));
    }

    @PostMapping("/{id}/join")
    @RequiresPermission(PermissionCode.POINTS_VIEW)
    public ResponseEntity<ApiResponse<PointChallengeResponse>> join(
            @PathVariable Long id, @RequestParam Long participantId) {
        return ResponseEntity.ok(ApiResponse.success(challengeService.join(id, participantId)));
    }

    @PostMapping("/{id}/complete")
    @RequiresPermission(PermissionCode.POINTS_MANAGE_CHALLENGES)
    public ResponseEntity<ApiResponse<PointChallengeResponse>> complete(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(challengeService.complete(id)));
    }

    @PostMapping("/{id}/cancel")
    @RequiresPermission(PermissionCode.POINTS_MANAGE_CHALLENGES)
    public ResponseEntity<ApiResponse<Void>> cancel(@PathVariable Long id) {
        challengeService.cancel(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
