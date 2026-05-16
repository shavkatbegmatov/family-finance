package uz.familyfinance.api.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.familyfinance.api.dto.response.ApiResponse;
import uz.familyfinance.api.enums.CategoryType;
import uz.familyfinance.api.enums.PermissionCode;
import uz.familyfinance.api.exception.BadRequestException;
import uz.familyfinance.api.security.RequiresPermission;
import uz.familyfinance.api.dto.response.export.CategoryReportExportRow;
import uz.familyfinance.api.dto.response.export.IncomeExpenseExportRow;
import uz.familyfinance.api.dto.response.export.MemberReportExportRow;
import uz.familyfinance.api.service.ReportExportService;
import uz.familyfinance.api.service.ReportService;
import uz.familyfinance.api.service.export.GenericExportService;
import uz.familyfinance.api.service.export.GenericExportService.ExportFormat;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/v1/reports")
@RequiredArgsConstructor
public class ReportController {

    private static final String EXCEL_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    private static final String PDF_MIME = "application/pdf";

    private final ReportService reportService;
    private final ReportExportService reportExportService;
    private final GenericExportService genericExportService;

    @GetMapping("/income-expense")
    @RequiresPermission(PermissionCode.REPORTS_VIEW)
    public ResponseEntity<ApiResponse<Map<String, Object>>> getIncomeExpense(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        validateRange(from, to);
        return ResponseEntity.ok(ApiResponse.success(
                reportService.getIncomeExpenseReport(from.atStartOfDay(), to.atTime(23, 59, 59))));
    }

    @GetMapping("/category")
    @RequiresPermission(PermissionCode.REPORTS_VIEW)
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getCategoryReport(
            @RequestParam CategoryType type,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        validateRange(from, to);
        return ResponseEntity.ok(ApiResponse.success(
                reportService.getCategoryReport(type, from.atStartOfDay(), to.atTime(23, 59, 59))));
    }

    @GetMapping("/member")
    @RequiresPermission(PermissionCode.REPORTS_VIEW)
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getMemberReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        validateRange(from, to);
        return ResponseEntity.ok(ApiResponse.success(
                reportService.getMemberReport(from.atStartOfDay(), to.atTime(23, 59, 59))));
    }

    // ============ Export endpoints ============

    @GetMapping("/income-expense/export")
    @RequiresPermission(PermissionCode.REPORTS_EXPORT)
    public ResponseEntity<byte[]> exportIncomeExpense(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "excel") String format) throws IOException {
        validateRange(from, to);
        ExportFormat exportFormat = resolveFormat(format);
        var rows = reportExportService.buildIncomeExpenseRows(from.atStartOfDay(), to.atTime(23, 59, 59));
        ByteArrayOutputStream bytes = genericExportService.export(
                rows, IncomeExpenseExportRow.class, exportFormat, "Daromad-Xarajat hisoboti");
        return downloadResponse(bytes, "daromad_xarajat", exportFormat);
    }

    @GetMapping("/category/export")
    @RequiresPermission(PermissionCode.REPORTS_EXPORT)
    public ResponseEntity<byte[]> exportCategoryReport(
            @RequestParam CategoryType type,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "excel") String format) throws IOException {
        validateRange(from, to);
        ExportFormat exportFormat = resolveFormat(format);
        var rows = reportExportService.buildCategoryRows(type, from.atStartOfDay(), to.atTime(23, 59, 59));
        ByteArrayOutputStream bytes = genericExportService.export(
                rows, CategoryReportExportRow.class, exportFormat, "Kategoriya bo'yicha hisobot");
        return downloadResponse(bytes, "kategoriya_" + type.name().toLowerCase(Locale.ROOT), exportFormat);
    }

    @GetMapping("/member/export")
    @RequiresPermission(PermissionCode.REPORTS_EXPORT)
    public ResponseEntity<byte[]> exportMemberReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "excel") String format) throws IOException {
        validateRange(from, to);
        ExportFormat exportFormat = resolveFormat(format);
        var rows = reportExportService.buildMemberRows(from.atStartOfDay(), to.atTime(23, 59, 59));
        ByteArrayOutputStream bytes = genericExportService.export(
                rows, MemberReportExportRow.class, exportFormat, "Oila a'zolari bo'yicha hisobot");
        return downloadResponse(bytes, "oila_azolari", exportFormat);
    }

    // ============ Helpers ============

    private void validateRange(LocalDate from, LocalDate to) {
        if (from == null || to == null) {
            throw new BadRequestException("Sana oralig'i to'liq ko'rsatilishi kerak");
        }
        if (from.isAfter(to)) {
            throw new BadRequestException("Boshlanish sanasi tugash sanasidan keyin bo'lmaydi");
        }
    }

    private ExportFormat resolveFormat(String format) {
        String normalized = format == null ? "" : format.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "pdf" -> ExportFormat.PDF;
            case "excel", "xlsx", "" -> ExportFormat.EXCEL;
            default -> throw new BadRequestException("Noma'lum eksport formati: " + format);
        };
    }

    private ResponseEntity<byte[]> downloadResponse(ByteArrayOutputStream bytes, String baseName, ExportFormat format) {
        String extension = format == ExportFormat.EXCEL ? "xlsx" : "pdf";
        String mime = format == ExportFormat.EXCEL ? EXCEL_MIME : PDF_MIME;
        LocalDateTime now = LocalDateTime.now();
        String fileName = String.format("%s_%s.%s", baseName,
                String.format("%04d%02d%02d", now.getYear(), now.getMonthValue(), now.getDayOfMonth()),
                extension);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                .contentType(MediaType.parseMediaType(mime))
                .body(bytes.toByteArray());
    }
}
