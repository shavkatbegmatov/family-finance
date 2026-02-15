package uz.familyfinance.api.controller;

import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.familyfinance.api.dto.request.FamilyMemberRequest;
import uz.familyfinance.api.dto.request.RegisterSelfRequest;
import uz.familyfinance.api.dto.request.UpdateSelfRequest;
import uz.familyfinance.api.dto.response.ApiResponse;
import uz.familyfinance.api.dto.response.FamilyMemberResponse;
import uz.familyfinance.api.dto.response.PagedResponse;
import uz.familyfinance.api.entity.FamilyMember;
import uz.familyfinance.api.enums.PermissionCode;
import uz.familyfinance.api.security.RequiresPermission;
import uz.familyfinance.api.service.FamilyMemberService;
import uz.familyfinance.api.service.export.GenericExportService;

import jakarta.validation.Valid;
import java.io.ByteArrayOutputStream;
import java.util.List;

@RestController
@RequestMapping("/v1/family-members")
@RequiredArgsConstructor
public class FamilyMemberController {

    private final FamilyMemberService familyMemberService;
    private final GenericExportService exportService;

    @GetMapping
    @RequiresPermission(PermissionCode.FAMILY_VIEW)
    public ResponseEntity<ApiResponse<PagedResponse<FamilyMemberResponse>>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search) {
        Page<FamilyMemberResponse> result = familyMemberService.getAll(search,
                PageRequest.of(page, size, Sort.by("createdAt").descending()));
        return ResponseEntity.ok(ApiResponse.success(PagedResponse.of(result)));
    }

    @GetMapping("/list")
    @RequiresPermission(PermissionCode.FAMILY_VIEW)
    public ResponseEntity<ApiResponse<List<FamilyMemberResponse>>> getAllActive() {
        return ResponseEntity.ok(ApiResponse.success(familyMemberService.getAllActive()));
    }

    @GetMapping("/{id}")
    @RequiresPermission(PermissionCode.FAMILY_VIEW)
    public ResponseEntity<ApiResponse<FamilyMemberResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(familyMemberService.getById(id)));
    }

    @PostMapping
    @RequiresPermission(PermissionCode.FAMILY_CREATE)
    public ResponseEntity<ApiResponse<FamilyMemberResponse>> create(@Valid @RequestBody FamilyMemberRequest request) {
        return ResponseEntity.ok(ApiResponse.success(familyMemberService.create(request)));
    }

    @PostMapping("/register-self")
    public ResponseEntity<ApiResponse<FamilyMemberResponse>> registerSelf(
            @Valid @RequestBody RegisterSelfRequest request) {
        return ResponseEntity.ok(ApiResponse.success(familyMemberService.registerSelf(request)));
    }

    @PutMapping("/update-self")
    public ResponseEntity<ApiResponse<FamilyMemberResponse>> updateSelf(
            @Valid @RequestBody UpdateSelfRequest request) {
        return ResponseEntity.ok(ApiResponse.success(familyMemberService.updateSelf(request)));
    }

    @PutMapping("/{id}")
    @RequiresPermission(PermissionCode.FAMILY_UPDATE)
    public ResponseEntity<ApiResponse<FamilyMemberResponse>> update(@PathVariable Long id,
            @Valid @RequestBody FamilyMemberRequest request) {
        return ResponseEntity.ok(ApiResponse.success(familyMemberService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(PermissionCode.FAMILY_DELETE)
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        familyMemberService.delete(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @GetMapping("/export/excel")
    @RequiresPermission(PermissionCode.FAMILY_EXPORT)
    public void exportExcel(HttpServletResponse response) throws Exception {
        List<FamilyMember> data = familyMemberService.getAllEntities();
        ByteArrayOutputStream out = exportService.export(data, FamilyMember.class,
                GenericExportService.ExportFormat.EXCEL, "Oila a'zolari");
        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setHeader("Content-Disposition", "attachment; filename=oila-azolari.xlsx");
        out.writeTo(response.getOutputStream());
    }

    @GetMapping("/export/pdf")
    @RequiresPermission(PermissionCode.FAMILY_EXPORT)
    public void exportPdf(HttpServletResponse response) throws Exception {
        List<FamilyMember> data = familyMemberService.getAllEntities();
        ByteArrayOutputStream out = exportService.export(data, FamilyMember.class,
                GenericExportService.ExportFormat.PDF, "Oila a'zolari");
        response.setContentType("application/pdf");
        response.setHeader("Content-Disposition", "attachment; filename=oila-azolari.pdf");
        out.writeTo(response.getOutputStream());
    }
}
