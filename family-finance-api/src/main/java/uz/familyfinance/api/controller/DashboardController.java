package uz.familyfinance.api.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.familyfinance.api.dto.response.ApiResponse;
import uz.familyfinance.api.dto.response.ChartDataResponse;
import uz.familyfinance.api.dto.response.DashboardStatsResponse;
import uz.familyfinance.api.dto.response.TransactionResponse;
import uz.familyfinance.api.enums.PermissionCode;
import uz.familyfinance.api.security.RequiresPermission;
import uz.familyfinance.api.service.DashboardService;
import uz.familyfinance.api.service.TransactionService;

import java.util.List;

@RestController
@RequestMapping("/v1/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;
    private final TransactionService transactionService;

    @GetMapping("/stats")
    @RequiresPermission(PermissionCode.DASHBOARD_VIEW)
    public ResponseEntity<ApiResponse<DashboardStatsResponse>> getStats() {
        return ResponseEntity.ok(ApiResponse.success(dashboardService.getStats()));
    }

    @GetMapping("/charts")
    @RequiresPermission(PermissionCode.DASHBOARD_VIEW)
    public ResponseEntity<ApiResponse<ChartDataResponse>> getCharts() {
        return ResponseEntity.ok(ApiResponse.success(dashboardService.getCharts()));
    }

    @GetMapping("/recent-transactions")
    @RequiresPermission(PermissionCode.DASHBOARD_VIEW)
    public ResponseEntity<ApiResponse<List<TransactionResponse>>> getRecentTransactions() {
        return ResponseEntity.ok(ApiResponse.success(transactionService.getRecent()));
    }
}
