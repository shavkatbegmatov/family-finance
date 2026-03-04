package uz.familyfinance.api.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.familyfinance.api.dto.request.PointTaskRequest;
import uz.familyfinance.api.dto.request.PointTaskVerifyRequest;
import uz.familyfinance.api.dto.response.*;
import uz.familyfinance.api.enums.PermissionCode;
import uz.familyfinance.api.enums.PointTaskStatus;
import uz.familyfinance.api.security.RequiresPermission;
import uz.familyfinance.api.service.PointTaskService;

import java.util.List;

@RestController
@RequestMapping("/v1/point-tasks")
@RequiredArgsConstructor
public class PointTaskController {

    private final PointTaskService taskService;

    @GetMapping
    @RequiresPermission(PermissionCode.POINTS_VIEW)
    public ResponseEntity<ApiResponse<PagedResponse<PointTaskResponse>>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status) {
        Page<PointTaskResponse> result;
        if (status != null) {
            result = taskService.getByStatus(PointTaskStatus.valueOf(status),
                    PageRequest.of(page, size, Sort.by("createdAt").descending()));
        } else {
            result = taskService.getAll(PageRequest.of(page, size, Sort.by("createdAt").descending()));
        }
        return ResponseEntity.ok(ApiResponse.success(PagedResponse.of(result)));
    }

    @GetMapping("/{id}")
    @RequiresPermission(PermissionCode.POINTS_VIEW)
    public ResponseEntity<ApiResponse<PointTaskResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(taskService.getById(id)));
    }

    @GetMapping("/pending-verification")
    @RequiresPermission(PermissionCode.POINTS_VERIFY_TASK)
    public ResponseEntity<ApiResponse<List<PointTaskResponse>>> getPendingVerification() {
        return ResponseEntity.ok(ApiResponse.success(taskService.getPendingVerification()));
    }

    @GetMapping("/my-tasks")
    @RequiresPermission(PermissionCode.POINTS_VIEW)
    public ResponseEntity<ApiResponse<List<PointTaskResponse>>> getMyTasks(
            @RequestParam Long participantId) {
        return ResponseEntity.ok(ApiResponse.success(taskService.getMyTasks(participantId)));
    }

    @PostMapping
    @RequiresPermission(PermissionCode.POINTS_ASSIGN_TASK)
    public ResponseEntity<ApiResponse<PointTaskResponse>> create(
            @Valid @RequestBody PointTaskRequest request) {
        return ResponseEntity.ok(ApiResponse.success(taskService.create(request)));
    }

    @PutMapping("/{id}")
    @RequiresPermission(PermissionCode.POINTS_ASSIGN_TASK)
    public ResponseEntity<ApiResponse<PointTaskResponse>> update(
            @PathVariable Long id, @Valid @RequestBody PointTaskRequest request) {
        return ResponseEntity.ok(ApiResponse.success(taskService.update(id, request)));
    }

    @PostMapping("/{id}/submit")
    @RequiresPermission(PermissionCode.POINTS_VIEW)
    public ResponseEntity<ApiResponse<PointTaskResponse>> submit(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(taskService.submit(id)));
    }

    @PostMapping("/{id}/verify")
    @RequiresPermission(PermissionCode.POINTS_VERIFY_TASK)
    public ResponseEntity<ApiResponse<PointTaskResponse>> verify(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(taskService.verify(id)));
    }

    @PostMapping("/{id}/reject")
    @RequiresPermission(PermissionCode.POINTS_VERIFY_TASK)
    public ResponseEntity<ApiResponse<PointTaskResponse>> reject(
            @PathVariable Long id, @RequestBody PointTaskVerifyRequest request) {
        return ResponseEntity.ok(ApiResponse.success(taskService.reject(id, request.getRejectionReason())));
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(PermissionCode.POINTS_MANAGE)
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        taskService.delete(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
