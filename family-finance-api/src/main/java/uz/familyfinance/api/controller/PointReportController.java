package uz.familyfinance.api.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.familyfinance.api.dto.response.ApiResponse;
import uz.familyfinance.api.dto.response.PointWeeklyReportResponse;
import uz.familyfinance.api.enums.PermissionCode;
import uz.familyfinance.api.security.RequiresPermission;
import uz.familyfinance.api.service.PointReportService;

import java.util.List;

@RestController
@RequestMapping("/v1/point-reports")
@RequiredArgsConstructor
public class PointReportController {

    private final PointReportService reportService;

    @GetMapping("/weekly/{participantId}")
    @RequiresPermission(PermissionCode.POINTS_VIEW)
    public ResponseEntity<ApiResponse<PointWeeklyReportResponse>> getWeeklyReport(
            @PathVariable Long participantId) {
        return ResponseEntity.ok(ApiResponse.success(reportService.getWeeklyReport(participantId)));
    }

    @GetMapping("/summary")
    @RequiresPermission(PermissionCode.POINTS_VIEW)
    public ResponseEntity<ApiResponse<List<PointWeeklyReportResponse>>> getSummary() {
        return ResponseEntity.ok(ApiResponse.success(reportService.getSummary()));
    }
}
