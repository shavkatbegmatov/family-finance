package uz.familyfinance.api.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.familyfinance.api.dto.response.ApiResponse;
import uz.familyfinance.api.enums.CategoryType;
import uz.familyfinance.api.enums.PermissionCode;
import uz.familyfinance.api.security.RequiresPermission;
import uz.familyfinance.api.service.ReportService;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    @GetMapping("/income-expense")
    @RequiresPermission(PermissionCode.REPORTS_VIEW)
    public ResponseEntity<ApiResponse<Map<String, Object>>> getIncomeExpense(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.success(
                reportService.getIncomeExpenseReport(from.atStartOfDay(), to.atTime(23, 59, 59))));
    }

    @GetMapping("/category")
    @RequiresPermission(PermissionCode.REPORTS_VIEW)
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getCategoryReport(
            @RequestParam CategoryType type,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.success(
                reportService.getCategoryReport(type, from.atStartOfDay(), to.atTime(23, 59, 59))));
    }

    @GetMapping("/member")
    @RequiresPermission(PermissionCode.REPORTS_VIEW)
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getMemberReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.success(
                reportService.getMemberReport(from.atStartOfDay(), to.atTime(23, 59, 59))));
    }
}
