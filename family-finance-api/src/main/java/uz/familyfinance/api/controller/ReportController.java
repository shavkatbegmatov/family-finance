package uz.familyfinance.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.familyfinance.api.dto.response.ApiResponse;
import uz.familyfinance.api.dto.response.DebtsReportResponse;
import uz.familyfinance.api.dto.response.SalesReportResponse;
import uz.familyfinance.api.dto.response.WarehouseReportResponse;
import uz.familyfinance.api.enums.PermissionCode;
import uz.familyfinance.api.security.RequiresPermission;
import uz.familyfinance.api.service.ReportService;

import java.time.LocalDate;

@RestController
@RequestMapping("/v1/reports")
@RequiredArgsConstructor
@Tag(name = "Reports", description = "Hisobotlar API")
public class ReportController {

    private final ReportService reportService;

    @GetMapping("/sales")
    @Operation(summary = "Get sales report", description = "Sotuvlar hisoboti")
    @RequiresPermission(PermissionCode.REPORTS_VIEW_SALES)
    public ResponseEntity<ApiResponse<SalesReportResponse>> getSalesReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(ApiResponse.success(reportService.getSalesReport(startDate, endDate)));
    }

    @GetMapping("/warehouse")
    @Operation(summary = "Get warehouse report", description = "Ombor hisoboti")
    @RequiresPermission(PermissionCode.REPORTS_VIEW_WAREHOUSE)
    public ResponseEntity<ApiResponse<WarehouseReportResponse>> getWarehouseReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(ApiResponse.success(reportService.getWarehouseReport(startDate, endDate)));
    }

    @GetMapping("/debts")
    @Operation(summary = "Get debts report", description = "Qarzlar hisoboti")
    @RequiresPermission(PermissionCode.REPORTS_VIEW_DEBTS)
    public ResponseEntity<ApiResponse<DebtsReportResponse>> getDebtsReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(ApiResponse.success(reportService.getDebtsReport(startDate, endDate)));
    }
}
