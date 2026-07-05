package uz.familyfinance.api.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.familyfinance.api.dto.response.ApiResponse;
import uz.familyfinance.api.dto.response.EnrollmentResponse;
import uz.familyfinance.api.dto.response.ScopeResponse;
import uz.familyfinance.api.security.RequiresSuperAdmin;
import uz.familyfinance.api.service.SchoolService;

import java.util.List;

/**
 * ADR-002 P4: Maktablar — ariza/tasdiq, sinflar, yozish (Enrollment).
 * Ruxsatlar servis ichida (ScopeContextService) — ScopeController naqshi.
 */
@RestController
@RequestMapping("/v1/schools")
@RequiredArgsConstructor
public class SchoolController {

    private final SchoolService schoolService;

    /** Maktab ochish arizasi (SUPER_ADMIN tasdiqlaguncha faol emas). */
    @PostMapping
    public ResponseEntity<ApiResponse<ScopeResponse>> apply(@Valid @RequestBody SchoolApplyRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                schoolService.applyForSchool(request.getName(), request.getDescription())));
    }

    /** SUPER_ADMIN — tasdiq kutayotgan maktab arizalari. */
    @GetMapping("/pending")
    @RequiresSuperAdmin
    public ResponseEntity<ApiResponse<List<ScopeResponse>>> pending() {
        return ResponseEntity.ok(ApiResponse.success(schoolService.getPendingSchools()));
    }

    /** SUPER_ADMIN — maktabni tasdiqlash. */
    @PostMapping("/{id}/approve")
    @RequiresSuperAdmin
    public ResponseEntity<ApiResponse<ScopeResponse>> approve(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(schoolService.approveSchool(id)));
    }

    /** Sinf yaratish — maktab egasi/admini. */
    @PostMapping("/{schoolId}/classes")
    public ResponseEntity<ApiResponse<ScopeResponse>> createClass(
            @PathVariable Long schoolId, @Valid @RequestBody ClassCreateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                schoolService.createClass(schoolId, request.getName())));
    }

    /** Farzandni sinfga yozish (ota-ona; nickname majburiy — K3). */
    @PostMapping("/classes/{classId}/enrollments")
    public ResponseEntity<ApiResponse<EnrollmentResponse>> enroll(
            @PathVariable Long classId, @Valid @RequestBody EnrollRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                schoolService.enroll(classId, request.getFamilyMemberId(), request.getNickname())));
    }

    /** Sinf ro'yxati (nickname-first; haqiqiy ism faqat o'qituvchiga). */
    @GetMapping("/classes/{classId}/enrollments")
    public ResponseEntity<ApiResponse<List<EnrollmentResponse>>> classEnrollments(
            @PathVariable Long classId) {
        return ResponseEntity.ok(ApiResponse.success(schoolService.getClassEnrollments(classId)));
    }

    /** Sinfdan chiqarish — yozgan ota-ona yoki sinf admini. */
    @DeleteMapping("/classes/{classId}/enrollments/{familyMemberId}")
    public ResponseEntity<ApiResponse<Void>> unenroll(
            @PathVariable Long classId, @PathVariable Long familyMemberId) {
        schoolService.unenroll(classId, familyMemberId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    /** Mening farzandlarim yozilgan sinflar. */
    @GetMapping("/my-children-enrollments")
    public ResponseEntity<ApiResponse<List<EnrollmentResponse>>> myChildren() {
        return ResponseEntity.ok(ApiResponse.success(schoolService.getMyChildrenEnrollments()));
    }

    // ===== Request DTO'lar (ixcham — controller-lokal) =====

    @Getter @Setter
    public static class SchoolApplyRequest {
        @NotBlank(message = "Maktab nomi majburiy")
        private String name;
        private String description;
    }

    @Getter @Setter
    public static class ClassCreateRequest {
        @NotBlank(message = "Sinf nomi majburiy")
        private String name;
    }

    @Getter @Setter
    public static class EnrollRequest {
        @NotNull(message = "Oila a'zosi majburiy")
        private Long familyMemberId;
        @NotBlank(message = "Taxallus majburiy")
        private String nickname;
    }
}
