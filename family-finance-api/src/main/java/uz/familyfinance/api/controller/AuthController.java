package uz.familyfinance.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import uz.familyfinance.api.dto.request.ChangePasswordRequest;
import uz.familyfinance.api.dto.request.LoginRequest;
import uz.familyfinance.api.dto.request.RegisterRequest;
import uz.familyfinance.api.dto.request.SwitchScopeRequest;
import uz.familyfinance.api.dto.response.ApiResponse;
import uz.familyfinance.api.dto.response.JwtResponse;
import uz.familyfinance.api.dto.response.SwitchScopeResponse;
import uz.familyfinance.api.dto.response.UserResponse;
import uz.familyfinance.api.entity.Session;
import uz.familyfinance.api.exception.BadRequestException;
import uz.familyfinance.api.security.AuthCookies;
import uz.familyfinance.api.security.CustomUserDetails;
import uz.familyfinance.api.security.LoginRateLimiter;
import uz.familyfinance.api.service.AuthService;
import uz.familyfinance.api.service.ScopeSwitchService;
import uz.familyfinance.api.service.SessionService;
import uz.familyfinance.api.service.UserService;

import java.time.Duration;

@RestController
@RequestMapping("/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Autentifikatsiya API")
public class AuthController {

    private final AuthService authService;
    private final UserService userService;
    private final SessionService sessionService;
    private final ScopeSwitchService scopeSwitchService;
    private final LoginRateLimiter loginRateLimiter;

    @Value("${jwt.refresh-expiration}")
    private long refreshExpiration;

    @PostMapping("/register")
    @Operation(summary = "Register", description = "Yangi foydalanuvchi ro'yxatdan o'tish")
    public ResponseEntity<ApiResponse<UserResponse>> register(
            @Valid @RequestBody RegisterRequest request) {
        UserResponse response = authService.register(request);
        return ResponseEntity.ok(ApiResponse.success("Muvaffaqiyatli ro'yxatdan o'tildi", response));
    }

    @PostMapping("/login")
    @Operation(summary = "Login", description = "Foydalanuvchi tizimga kirish")
    public ResponseEntity<ApiResponse<JwtResponse>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {

        String ipAddress = getClientIpAddress(httpRequest);
        String userAgent = httpRequest.getHeader("User-Agent");

        // C6: IP-asosli rate-limit (brute-force/DoS himoyasi). LoginAttemptService per-username
        // lockout'iga qo'shimcha. Oshib ketsa 429.
        if (!loginRateLimiter.allow(ipAddress)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Juda ko'p kirish urinishi. Birozdan so'ng qayta urinib ko'ring.");
        }

        JwtResponse response = authService.login(request, ipAddress, userAgent);
        // D12-PR4: refresh token httpOnly cookie'da ham (additive — body'da ham qaytadi)
        ResponseCookie refreshCookie = AuthCookies.refreshCookie(
                response.getRefreshToken(), Duration.ofMillis(refreshExpiration));
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshCookie.toString())
                .body(ApiResponse.success("Muvaffaqiyatli kirish", response));
    }

    @PostMapping("/refresh-token")
    @Operation(summary = "Refresh Token", description = "Token yangilash")
    public ResponseEntity<ApiResponse<JwtResponse>> refreshToken(
            @RequestParam(required = false) String refreshToken,
            HttpServletRequest httpRequest) {
        // D12-PR4: refresh token query param (legacy) yoki httpOnly cookie (PR5 cutover) dan
        String token = StringUtils.hasText(refreshToken)
                ? refreshToken
                : AuthCookies.readRefreshToken(httpRequest);
        if (!StringUtils.hasText(token)) {
            throw new BadRequestException("Refresh token topilmadi");
        }
        String ipAddress = getClientIpAddress(httpRequest);
        String userAgent = httpRequest.getHeader("User-Agent");
        JwtResponse response = authService.refreshToken(token, ipAddress, userAgent);
        // Rotatsiya: yangi refresh token cookie'ni ham yangilash
        ResponseCookie refreshCookie = AuthCookies.refreshCookie(
                response.getRefreshToken(), Duration.ofMillis(refreshExpiration));
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshCookie.toString())
                .body(ApiResponse.success(response));
    }

    @GetMapping("/me")
    @Operation(summary = "Current User", description = "Joriy foydalanuvchi ma'lumotlari")
    public ResponseEntity<ApiResponse<UserResponse>> getCurrentUser() {
        UserResponse response = authService.getCurrentUser();
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/switch-scope")
    @Operation(summary = "Switch Active Scope",
               description = "Aktiv scope'ni o'zgartirish — yangi JWT token qaytariladi")
    public ResponseEntity<ApiResponse<SwitchScopeResponse>> switchScope(
            @Valid @RequestBody SwitchScopeRequest request,
            HttpServletRequest httpRequest) {
        String ipAddress = getClientIpAddress(httpRequest);
        String userAgent = httpRequest.getHeader("User-Agent");
        SwitchScopeResponse response = scopeSwitchService.switchScope(request, ipAddress, userAgent);
        return ResponseEntity.ok(ApiResponse.success(
                "Aktiv scope o'zgartirildi. Yangi token bilan davom eting.", response));
    }

    @PostMapping("/logout")
    @Operation(summary = "Logout", description = "Tizimdan chiqish va joriy sessionni bekor qilish")
    public ResponseEntity<ApiResponse<Void>> logout(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestHeader("Authorization") String authHeader
    ) {
        String currentToken = authHeader.substring(7); // Remove "Bearer "

        // Find and revoke current session
        Session currentSession = sessionService.getSessionByToken(currentToken).orElse(null);

        if (currentSession != null) {
            // Revoke session WITH notification to update other devices' session lists
            // Frontend handles intentional logout flag to prevent showing error message to the user
            sessionService.revokeSession(
                currentSession.getId(),
                userDetails.getUser().getId(),
                "User logged out",
                true  // Send notification so other devices can refresh their session lists
            );
        }

        // D12-PR4: refresh token cookie'ni ham tozalash
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, AuthCookies.clearRefreshCookie().toString())
                .body(ApiResponse.success("Muvaffaqiyatli chiqish"));
    }

    @PostMapping("/change-password")
    @Operation(summary = "Change Password", description = "Parolni o'zgartirish")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        // Validate password confirmation
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Yangi parol va tasdiqlash mos kelmadi"));
        }

        userService.changePassword(
                userDetails.getId(),
                request.getCurrentPassword(),
                request.getNewPassword()
        );

        return ResponseEntity.ok(ApiResponse.success("Parol muvaffaqiyatli o'zgartirildi"));
    }

    private String getClientIpAddress(HttpServletRequest request) {
        // Faqat remoteAddr ishlatamiz — X-Forwarded-For spoofing xavfi bor
        // Production'da reverse proxy (nginx) orqali real IP olish uchun
        // server.forward-headers-strategy=NATIVE sozlamasini ishlatish kerak
        return request.getRemoteAddr();
    }
}
