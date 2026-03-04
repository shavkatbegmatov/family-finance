package uz.familyfinance.api.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.familyfinance.api.dto.response.ApiResponse;
import uz.familyfinance.api.dto.response.LeaderboardEntryResponse;
import uz.familyfinance.api.enums.PermissionCode;
import uz.familyfinance.api.security.RequiresPermission;
import uz.familyfinance.api.service.PointLeaderboardService;

import java.util.List;

@RestController
@RequestMapping("/v1/point-leaderboard")
@RequiredArgsConstructor
public class PointLeaderboardController {

    private final PointLeaderboardService leaderboardService;

    @GetMapping
    @RequiresPermission(PermissionCode.POINTS_VIEW_LEADERBOARD)
    public ResponseEntity<ApiResponse<List<LeaderboardEntryResponse>>> getOverall() {
        return ResponseEntity.ok(ApiResponse.success(leaderboardService.getOverallLeaderboard()));
    }

    @GetMapping("/weekly")
    @RequiresPermission(PermissionCode.POINTS_VIEW_LEADERBOARD)
    public ResponseEntity<ApiResponse<List<LeaderboardEntryResponse>>> getWeekly() {
        return ResponseEntity.ok(ApiResponse.success(leaderboardService.getWeeklyLeaderboard()));
    }

    @GetMapping("/monthly")
    @RequiresPermission(PermissionCode.POINTS_VIEW_LEADERBOARD)
    public ResponseEntity<ApiResponse<List<LeaderboardEntryResponse>>> getMonthly() {
        return ResponseEntity.ok(ApiResponse.success(leaderboardService.getMonthlyLeaderboard()));
    }
}
