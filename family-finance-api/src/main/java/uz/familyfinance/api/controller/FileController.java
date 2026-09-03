package uz.familyfinance.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import uz.familyfinance.api.dto.response.ApiResponse;
import uz.familyfinance.api.dto.response.StoredFileResponse;
import uz.familyfinance.api.entity.StoredFile;
import uz.familyfinance.api.enums.PermissionCode;
import uz.familyfinance.api.security.CustomUserDetails;
import uz.familyfinance.api.security.RequiresPermission;
import uz.familyfinance.api.service.FileStorageService;

import java.time.Duration;
import java.util.UUID;

/**
 * Rasm (avatar) fayllari — G10: ImgBB o'rniga ilovaning o'zi saqlaydi.
 *
 * <p>{@code GET /v1/files/{id}} ochiq (SecurityConfig permitAll): URL taxmin qilib bo'lmaydigan
 * UUID, avval ImgBB havolalari ham xuddi shunday ochiq edi, {@code <img src>} esa Authorization
 * header yubora olmaydi. Kontent bir marta yozilib o'zgarmaydi → uzoq immutable cache.</p>
 */
@RestController
@RequestMapping("/v1/files")
@RequiredArgsConstructor
@Tag(name = "Files", description = "Rasm (avatar) fayllarini saqlash va berish")
public class FileController {

    private static final Duration IMMUTABLE_CACHE = Duration.ofDays(365);

    private final FileStorageService fileStorageService;

    @PostMapping(value = "/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @RequiresPermission(value = {PermissionCode.FAMILY_CREATE, PermissionCode.FAMILY_UPDATE})
    @Operation(summary = "Avatar yuklash",
               description = "JPEG/PNG/WebP, 2 MB gacha; javobdagi url `avatar` maydoniga yoziladi")
    public ResponseEntity<ApiResponse<StoredFileResponse>> uploadAvatar(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        StoredFile stored = fileStorageService.storeAvatar(file, userDetails.getId());
        StoredFileResponse response = StoredFileResponse.builder()
                .url(fileStorageService.publicUrl(stored.getPublicId()))
                .contentType(stored.getContentType())
                .sizeBytes(stored.getSizeBytes())
                .build();
        return ResponseEntity.ok(ApiResponse.success("Rasm yuklandi", response));
    }

    @GetMapping("/{publicId}")
    @Operation(summary = "Faylni olish", description = "Ochiq: UUID bo'yicha rasm baytlari")
    public ResponseEntity<byte[]> getFile(@PathVariable UUID publicId) {
        StoredFile stored = fileStorageService.getByPublicId(publicId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(stored.getContentType()))
                .contentLength(stored.getSizeBytes())
                .cacheControl(CacheControl.maxAge(IMMUTABLE_CACHE).cachePublic().immutable())
                .eTag("\"" + publicId + "\"")
                // Faqat magic-bytes bilan tasdiqlangan rasm turlari saqlanadi; nosniff qo'shimcha qatlam
                .header("X-Content-Type-Options", "nosniff")
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline")
                .body(stored.getData());
    }
}
