package uz.familyfinance.api.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.familyfinance.api.dto.request.TagRequest;
import uz.familyfinance.api.dto.response.ApiResponse;
import uz.familyfinance.api.dto.response.TagResponse;
import uz.familyfinance.api.enums.PermissionCode;
import uz.familyfinance.api.security.RequiresPermission;
import uz.familyfinance.api.service.TagService;

import jakarta.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/v1/tags")
@RequiredArgsConstructor
public class TagController {

    private final TagService tagService;

    @GetMapping
    @RequiresPermission(PermissionCode.TRANSACTIONS_VIEW)
    public ResponseEntity<ApiResponse<List<TagResponse>>> getAll(
            @RequestParam(required = false) String search) {
        List<TagResponse> tags = (search == null || search.isBlank())
                ? tagService.getAll()
                : tagService.search(search);
        return ResponseEntity.ok(ApiResponse.success(tags));
    }

    @PostMapping
    @RequiresPermission(PermissionCode.TRANSACTIONS_UPDATE)
    public ResponseEntity<ApiResponse<TagResponse>> create(@Valid @RequestBody TagRequest request) {
        return ResponseEntity.ok(ApiResponse.success(tagService.create(request)));
    }

    @PutMapping("/{id}")
    @RequiresPermission(PermissionCode.TRANSACTIONS_UPDATE)
    public ResponseEntity<ApiResponse<TagResponse>> update(@PathVariable Long id,
                                                            @Valid @RequestBody TagRequest request) {
        return ResponseEntity.ok(ApiResponse.success(tagService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(PermissionCode.TRANSACTIONS_UPDATE)
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        tagService.delete(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
