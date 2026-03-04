package uz.familyfinance.api.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.familyfinance.api.dto.request.PointMultiplierEventRequest;
import uz.familyfinance.api.dto.response.ApiResponse;
import uz.familyfinance.api.dto.response.PointMultiplierEventResponse;
import uz.familyfinance.api.entity.PointMultiplierEvent;
import uz.familyfinance.api.enums.PermissionCode;
import uz.familyfinance.api.enums.PointTaskCategory;
import uz.familyfinance.api.exception.ResourceNotFoundException;
import uz.familyfinance.api.repository.PointMultiplierEventRepository;
import uz.familyfinance.api.security.RequiresPermission;
import uz.familyfinance.api.service.PointConfigService;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/v1/point-events")
@RequiredArgsConstructor
public class PointMultiplierEventController {

    private final PointMultiplierEventRepository eventRepository;
    private final PointConfigService configService;

    @GetMapping
    @RequiresPermission(PermissionCode.POINTS_VIEW)
    public ResponseEntity<ApiResponse<List<PointMultiplierEventResponse>>> getAll() {
        Long groupId = configService.getCurrentFamilyGroupId();
        return ResponseEntity.ok(ApiResponse.success(
                eventRepository.findByFamilyGroupId(groupId).stream()
                        .map(this::toResponse).collect(Collectors.toList())));
    }

    @GetMapping("/active")
    @RequiresPermission(PermissionCode.POINTS_VIEW)
    public ResponseEntity<ApiResponse<List<PointMultiplierEventResponse>>> getActive() {
        Long groupId = configService.getCurrentFamilyGroupId();
        return ResponseEntity.ok(ApiResponse.success(
                eventRepository.findAllActiveEvents(groupId, LocalDateTime.now()).stream()
                        .map(this::toResponse).collect(Collectors.toList())));
    }

    @PostMapping
    @RequiresPermission(PermissionCode.POINTS_MANAGE_EVENTS)
    public ResponseEntity<ApiResponse<PointMultiplierEventResponse>> create(
            @Valid @RequestBody PointMultiplierEventRequest request) {
        var userDetails = configService.getCurrentUserDetails();
        PointMultiplierEvent event = PointMultiplierEvent.builder()
                .familyGroup(configService.getCurrentFamilyGroup())
                .name(request.getName())
                .description(request.getDescription())
                .multiplier(request.getMultiplier())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .createdBy(userDetails.getUser())
                .build();
        if (request.getTaskCategory() != null) {
            event.setTaskCategory(PointTaskCategory.valueOf(request.getTaskCategory()));
        }
        return ResponseEntity.ok(ApiResponse.success(toResponse(eventRepository.save(event))));
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(PermissionCode.POINTS_MANAGE_EVENTS)
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        PointMultiplierEvent event = eventRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Event topilmadi"));
        event.setIsActive(false);
        eventRepository.save(event);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    private PointMultiplierEventResponse toResponse(PointMultiplierEvent e) {
        PointMultiplierEventResponse r = new PointMultiplierEventResponse();
        r.setId(e.getId());
        r.setName(e.getName());
        r.setDescription(e.getDescription());
        r.setMultiplier(e.getMultiplier());
        r.setStartDate(e.getStartDate());
        r.setEndDate(e.getEndDate());
        if (e.getTaskCategory() != null) r.setTaskCategory(e.getTaskCategory().name());
        r.setIsActive(e.getIsActive());
        r.setCreatedByName(e.getCreatedBy().getFullName());
        r.setCreatedAt(e.getCreatedAt());
        return r;
    }
}
