package uz.familyfinance.api.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.familyfinance.api.dto.request.PointConversionRequest;
import uz.familyfinance.api.dto.response.*;
import uz.familyfinance.api.enums.PermissionCode;
import uz.familyfinance.api.security.RequiresPermission;
import uz.familyfinance.api.service.PointConversionService;

import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequestMapping("/v1/point-conversions")
@RequiredArgsConstructor
public class PointConversionController {

    private final PointConversionService conversionService;

    @PostMapping
    @RequiresPermission(PermissionCode.POINTS_CONVERT)
    public ResponseEntity<ApiResponse<PointConversionResponse>> convert(
            @Valid @RequestBody PointConversionRequest request) {
        return ResponseEntity.ok(ApiResponse.success(conversionService.convert(request)));
    }

    @GetMapping("/{participantId}")
    @RequiresPermission(PermissionCode.POINTS_VIEW)
    public ResponseEntity<ApiResponse<PagedResponse<PointConversionResponse>>> getByParticipant(
            @PathVariable Long participantId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<PointConversionResponse> result = conversionService.getByParticipant(participantId,
                PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.success(PagedResponse.of(result)));
    }

    @GetMapping("/calculate")
    @RequiresPermission(PermissionCode.POINTS_VIEW)
    public ResponseEntity<ApiResponse<Map<String, Object>>> calculate(@RequestParam int points) {
        BigDecimal amount = conversionService.calculateConversion(points);
        return ResponseEntity.ok(ApiResponse.success(Map.of("points", points, "moneyAmount", amount)));
    }
}
