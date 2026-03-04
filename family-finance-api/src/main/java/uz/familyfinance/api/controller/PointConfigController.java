package uz.familyfinance.api.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.familyfinance.api.dto.request.PointConfigRequest;
import uz.familyfinance.api.dto.response.ApiResponse;
import uz.familyfinance.api.dto.response.PointConfigResponse;
import uz.familyfinance.api.enums.PermissionCode;
import uz.familyfinance.api.security.RequiresPermission;
import uz.familyfinance.api.service.PointConfigService;

@RestController
@RequestMapping("/v1/point-config")
@RequiredArgsConstructor
public class PointConfigController {

    private final PointConfigService configService;

    @GetMapping
    @RequiresPermission(PermissionCode.POINTS_VIEW)
    public ResponseEntity<ApiResponse<PointConfigResponse>> get() {
        return ResponseEntity.ok(ApiResponse.success(configService.getConfig()));
    }

    @PostMapping
    @RequiresPermission(PermissionCode.POINTS_MANAGE)
    public ResponseEntity<ApiResponse<PointConfigResponse>> createOrUpdate(
            @Valid @RequestBody PointConfigRequest request) {
        return ResponseEntity.ok(ApiResponse.success(configService.createOrUpdate(request)));
    }
}
