package uz.familyfinance.api.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.familyfinance.api.dto.request.PointPurchaseRequest;
import uz.familyfinance.api.dto.request.PointShopItemRequest;
import uz.familyfinance.api.dto.response.*;
import uz.familyfinance.api.enums.PermissionCode;
import uz.familyfinance.api.security.RequiresPermission;
import uz.familyfinance.api.service.PointShopService;

import java.util.List;

@RestController
@RequestMapping("/v1/point-shop")
@RequiredArgsConstructor
public class PointShopController {

    private final PointShopService shopService;

    @GetMapping
    @RequiresPermission(PermissionCode.POINTS_VIEW)
    public ResponseEntity<ApiResponse<List<PointShopItemResponse>>> getItems() {
        return ResponseEntity.ok(ApiResponse.success(shopService.getActiveItems()));
    }

    @GetMapping("/all")
    @RequiresPermission(PermissionCode.POINTS_MANAGE_SHOP)
    public ResponseEntity<ApiResponse<List<PointShopItemResponse>>> getAllItems() {
        return ResponseEntity.ok(ApiResponse.success(shopService.getAllItems()));
    }

    @PostMapping("/items")
    @RequiresPermission(PermissionCode.POINTS_MANAGE_SHOP)
    public ResponseEntity<ApiResponse<PointShopItemResponse>> createItem(
            @Valid @RequestBody PointShopItemRequest request) {
        return ResponseEntity.ok(ApiResponse.success(shopService.createItem(request)));
    }

    @PutMapping("/items/{id}")
    @RequiresPermission(PermissionCode.POINTS_MANAGE_SHOP)
    public ResponseEntity<ApiResponse<PointShopItemResponse>> updateItem(
            @PathVariable Long id, @Valid @RequestBody PointShopItemRequest request) {
        return ResponseEntity.ok(ApiResponse.success(shopService.updateItem(id, request)));
    }

    @DeleteMapping("/items/{id}")
    @RequiresPermission(PermissionCode.POINTS_MANAGE_SHOP)
    public ResponseEntity<ApiResponse<Void>> deleteItem(@PathVariable Long id) {
        shopService.deleteItem(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PostMapping("/purchase")
    @RequiresPermission(PermissionCode.POINTS_VIEW)
    public ResponseEntity<ApiResponse<PointPurchaseResponse>> purchase(
            @Valid @RequestBody PointPurchaseRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                shopService.purchase(request.getParticipantId(), request.getShopItemId())));
    }

    @PostMapping("/{id}/deliver")
    @RequiresPermission(PermissionCode.POINTS_MANAGE_SHOP)
    public ResponseEntity<ApiResponse<PointPurchaseResponse>> deliver(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(shopService.deliver(id)));
    }

    @GetMapping("/purchases/{participantId}")
    @RequiresPermission(PermissionCode.POINTS_VIEW)
    public ResponseEntity<ApiResponse<PagedResponse<PointPurchaseResponse>>> getPurchases(
            @PathVariable Long participantId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<PointPurchaseResponse> result = shopService.getPurchasesByParticipant(participantId,
                PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.success(PagedResponse.of(result)));
    }
}
