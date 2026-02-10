package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.dto.request.LoginRequest;
import uz.familyfinance.api.dto.request.RegisterRequest;
import uz.familyfinance.api.dto.response.JwtResponse;
import uz.familyfinance.api.dto.response.UserResponse;
import uz.familyfinance.api.entity.LoginAttempt;
import uz.familyfinance.api.entity.RoleEntity;
import uz.familyfinance.api.entity.Session;
import uz.familyfinance.api.entity.User;
import uz.familyfinance.api.enums.Role;
import uz.familyfinance.api.exception.AccountDisabledException;
import uz.familyfinance.api.exception.AccountLockedException;
import uz.familyfinance.api.exception.ResourceNotFoundException;
import uz.familyfinance.api.repository.RoleRepository;
import uz.familyfinance.api.repository.UserRepository;
import uz.familyfinance.api.security.CustomUserDetails;
import uz.familyfinance.api.security.JwtTokenProvider;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final SessionService sessionService;
    private final LoginAttemptService loginAttemptService;
    private final AuditLogService auditLogService;

    @Value("${jwt.expiration}")
    private long jwtExpiration;

    @Transactional
    public UserResponse register(RegisterRequest request) {
        // Check username uniqueness
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("Bu username allaqachon band");
        }

        // Validate password match
        if (!request.getPassword().equals(request.getConfirmPassword())) {
            throw new IllegalArgumentException("Parol va tasdiqlash mos kelmadi");
        }

        // Validate password strength
        validatePassword(request.getPassword());

        // Find MEMBER role
        RoleEntity memberRole = roleRepository.findByCode("MEMBER")
                .orElseThrow(() -> new ResourceNotFoundException("Rol topilmadi: MEMBER"));

        // Create user
        User user = User.builder()
                .username(request.getUsername())
                .password(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .email(request.getEmail())
                .phone(request.getPhone())
                .role(Role.SELLER) // Legacy field
                .active(true)
                .mustChangePassword(false)
                .build();

        user.getRoles().add(memberRole);
        userRepository.save(user);

        // Audit log
        auditLogService.log(
                "User",
                user.getId(),
                "USER_REGISTERED",
                null,
                String.format("Foydalanuvchi ro'yxatdan o'tdi: %s", user.getUsername()),
                user.getId()
        );

        log.info("New user registered: {}", user.getUsername());

        return UserResponse.from(user);
    }

    private void validatePassword(String password) {
        if (password == null || password.length() < 6) {
            throw new IllegalArgumentException("Parol kamida 6 belgidan iborat bo'lishi kerak");
        }

        boolean hasUpper = password.chars().anyMatch(Character::isUpperCase);
        boolean hasLower = password.chars().anyMatch(Character::isLowerCase);
        boolean hasDigit = password.chars().anyMatch(Character::isDigit);

        if (!hasUpper || !hasLower || !hasDigit) {
            throw new IllegalArgumentException("Parol katta harf, kichik harf va raqam o'z ichiga olishi kerak");
        }
    }

    public JwtResponse login(LoginRequest request, String ipAddress, String userAgent) {
        String username = request.getUsername();

        // Check if account is locked due to too many failed attempts
        if (loginAttemptService.isAccountLocked(username)) {
            long remainingMinutes = loginAttemptService.getRemainingLockoutTime(username);

            // Log failed attempt
            loginAttemptService.logFailedAttempt(
                username,
                ipAddress,
                userAgent,
                LoginAttempt.FailureReason.ACCOUNT_LOCKED,
                "Account temporarily locked due to too many failed attempts. Try again in " + remainingMinutes + " minutes."
            );

            throw new AccountLockedException(
                "Akkaunt vaqtincha bloklandi. " + remainingMinutes + " daqiqadan so'ng urinib ko'ring."
            );
        }

        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.getUsername(),
                            request.getPassword()
                    )
            );

            SecurityContextHolder.getContext().setAuthentication(authentication);

            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
            Long userId = userDetails.getUser().getId();

            // Generate token with permissions
            String accessToken = tokenProvider.generateStaffTokenWithPermissions(
                    userDetails.getUsername(),
                    userId,
                    userDetails.getRoleCodes(),
                    userDetails.getPermissions()
            );
            String refreshToken = tokenProvider.generateStaffRefreshToken(userDetails.getUsername(), userId);

            // Create session in database
            LocalDateTime expiresAt = LocalDateTime.now().plusSeconds(jwtExpiration / 1000);
            Session session = sessionService.createSession(
                userDetails.getUser(),
                accessToken,
                ipAddress,
                userAgent,
                expiresAt
            );

            // Log successful login attempt
            loginAttemptService.logSuccessfulAttempt(username, ipAddress, userAgent, session);

            // Check if user must change password
            Boolean mustChangePassword = Boolean.TRUE.equals(userDetails.getUser().getMustChangePassword());

            return JwtResponse.builder()
                    .accessToken(accessToken)
                    .refreshToken(refreshToken)
                    .user(UserResponse.from(userDetails.getUser()))
                    .permissions(userDetails.getPermissions())
                    .roles(userDetails.getRoleCodes())
                    .requiresPasswordChange(mustChangePassword)
                    .build();

        } catch (BadCredentialsException e) {
            // Log failed login attempt
            User user = userRepository.findByUsername(username).orElse(null);
            LoginAttempt.FailureReason reason = user == null
                    ? LoginAttempt.FailureReason.USER_NOT_FOUND
                    : LoginAttempt.FailureReason.INVALID_PASSWORD;

            loginAttemptService.logFailedAttempt(
                username,
                ipAddress,
                userAgent,
                reason,
                "Invalid username or password"
            );

            throw new BadCredentialsException("Noto'g'ri foydalanuvchi nomi yoki parol");

        } catch (DisabledException e) {
            // Log failed login for disabled account
            loginAttemptService.logFailedAttempt(
                username,
                ipAddress,
                userAgent,
                LoginAttempt.FailureReason.ACCOUNT_DISABLED,
                "Account is disabled"
            );

            throw new AccountDisabledException("Akkaunt faol emas");
        }
    }

    public JwtResponse refreshToken(String refreshToken) {
        if (tokenProvider.validateToken(refreshToken)) {
            String username = tokenProvider.getUsernameFromToken(refreshToken);
            User user = userRepository.findByUsernameWithRolesAndPermissions(username)
                    .orElseThrow(() -> new ResourceNotFoundException("Foydalanuvchi", "username", username));

            CustomUserDetails userDetails = new CustomUserDetails(user);

            String newAccessToken = tokenProvider.generateStaffTokenWithPermissions(
                    username,
                    user.getId(),
                    userDetails.getRoleCodes(),
                    userDetails.getPermissions()
            );
            String newRefreshToken = tokenProvider.generateStaffRefreshToken(username, user.getId());

            return JwtResponse.builder()
                    .accessToken(newAccessToken)
                    .refreshToken(newRefreshToken)
                    .user(UserResponse.from(user))
                    .permissions(userDetails.getPermissions())
                    .roles(userDetails.getRoleCodes())
                    .build();
        }
        throw new RuntimeException("Refresh token yaroqsiz");
    }

    public UserResponse getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        return UserResponse.from(userDetails.getUser());
    }
}
