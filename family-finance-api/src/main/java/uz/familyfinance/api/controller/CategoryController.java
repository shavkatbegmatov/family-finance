package uz.familyfinance.api.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.familyfinance.api.dto.request.CategoryRequest;
import uz.familyfinance.api.dto.response.ApiResponse;
import uz.familyfinance.api.dto.response.CategoryResponse;
import uz.familyfinance.api.dto.response.PagedResponse;
import uz.familyfinance.api.enums.CategoryType;
import uz.familyfinance.api.enums.PermissionCode;
import uz.familyfinance.api.security.RequiresPermission;
import uz.familyfinance.api.service.CategoryService;

import jakarta.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/v1/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    @GetMapping
    @RequiresPermission(PermissionCode.CATEGORIES_VIEW)
    public ResponseEntity<ApiResponse<PagedResponse<CategoryResponse>>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        Page<CategoryResponse> result = categoryService.getAll(
                PageRequest.of(page, size, Sort.by("name").ascending()));
        return ResponseEntity.ok(ApiResponse.success(PagedResponse.of(result)));
    }

    @GetMapping("/by-type")
    @RequiresPermission(PermissionCode.CATEGORIES_VIEW)
    public ResponseEntity<ApiResponse<List<CategoryResponse>>> getByType(@RequestParam CategoryType type) {
        return ResponseEntity.ok(ApiResponse.success(categoryService.getByType(type)));
    }

    @GetMapping("/tree")
    @RequiresPermission(PermissionCode.CATEGORIES_VIEW)
    public ResponseEntity<ApiResponse<List<CategoryResponse>>> getTree(
            @RequestParam(required = false) CategoryType type) {
        return ResponseEntity.ok(ApiResponse.success(categoryService.getTree(type)));
    }

    @GetMapping("/{id}")
    @RequiresPermission(PermissionCode.CATEGORIES_VIEW)
    public ResponseEntity<ApiResponse<CategoryResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(categoryService.getById(id)));
    }

    @PostMapping
    @RequiresPermission(PermissionCode.CATEGORIES_CREATE)
    public ResponseEntity<ApiResponse<CategoryResponse>> create(@Valid @RequestBody CategoryRequest request) {
        return ResponseEntity.ok(ApiResponse.success(categoryService.create(request)));
    }

    @PutMapping("/{id}")
    @RequiresPermission(PermissionCode.CATEGORIES_UPDATE)
    public ResponseEntity<ApiResponse<CategoryResponse>> update(@PathVariable Long id,
            @Valid @RequestBody CategoryRequest request) {
        return ResponseEntity.ok(ApiResponse.success(categoryService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(PermissionCode.CATEGORIES_DELETE)
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        categoryService.delete(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
