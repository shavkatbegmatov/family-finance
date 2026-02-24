package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.dto.request.UpdateUserRequest;
import uz.familyfinance.api.dto.response.CredentialsInfo;
import uz.familyfinance.api.dto.response.UserDetailResponse;
import uz.familyfinance.api.entity.FamilyMember;
import uz.familyfinance.api.entity.RoleEntity;
import uz.familyfinance.api.entity.User;
import uz.familyfinance.api.enums.Role;
import uz.familyfinance.api.exception.ResourceNotFoundException;
import uz.familyfinance.api.repository.RoleRepository;
import uz.familyfinance.api.repository.UserRepository;

import java.security.SecureRandom;
import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Service for user management including credential generation for employees.
 * Handles username generation, password management, and user lifecycle.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;

    private static final String PASSWORD_CHARS_UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    private static final String PASSWORD_CHARS_LOWER = "abcdefghjkmnpqrstuvwxyz";
    private static final String PASSWORD_CHARS_DIGITS = "23456789";
    private static final String PASSWORD_CHARS_SPECIAL = "@#$%&*!";
    private static final SecureRandom RANDOM = new SecureRandom();

    /**
     * Creates a user account for a family member with auto-generated credentials.
     *
     * @param member The family member to create user for
     * @param roleCode The role code to assign (e.g., "ADMIN", "MEMBER")
     * @return CredentialsInfo containing username and temporary password
     */
    @Transactional
    public CredentialsInfo createUserForFamilyMember(FamilyMember member, String roleCode) {
        return createUserForFamilyMember(member, roleCode, null);
    }

    @Transactional
    public CredentialsInfo createUserForFamilyMember(FamilyMember member, String roleCode, String customPassword) {
        // Generate unique username
        String username = generateUsername(member.getFullName());

        // Use custom password or generate temporary
        boolean isCustomPassword = customPassword != null && !customPassword.isBlank();
        String temporaryPassword = isCustomPassword ? customPassword : generateTemporaryPassword();

        // Find role
        RoleEntity role = roleRepository.findByCode(roleCode)
                .orElseThrow(() -> new ResourceNotFoundException("Rol topilmadi: " + roleCode));

        // Get current user as creator
        User createdBy = getCurrentUser();

        // Create user
        Role legacyRole = resolveLegacyRole(roleCode);
        User user = User.builder()
                .username(username)
                .password(passwordEncoder.encode(temporaryPassword))
                .fullName(member.getFullName())
                .phone(member.getPhone())
                .role(legacyRole) // Legacy field
                .active(true)
                .mustChangePassword(!isCustomPassword)
                .createdBy(createdBy)
                .build();

        // Add role to user (ensures proper persistence of user_roles join table)
        user.getRoles().add(role);

        userRepository.save(user);

        // Log the action
        Long creatorId = createdBy != null ? createdBy.getId() : null;
        auditLogService.log(
                "User",
                user.getId(),
                "USER_CREATED",
                null,
                String.format("User '%s' yaratildi (oila a'zosi: %s)", username, member.getFullName()),
                creatorId
        );

        log.info("User created for family member: {} with username: {}", member.getFullName(), username);

        return CredentialsInfo.builder()
                .username(username)
                .temporaryPassword(temporaryPassword)
                .message(isCustomPassword
                        ? "Akkaunt yaratildi. Login ma'lumotlarini oila a'zosiga yetkazing!"
                        : "Ushbu parol faqat bir marta ko'rsatiladi. Oila a'zosiga yetkazing!")
                .mustChangePassword(!isCustomPassword)
                .build();
    }

    private Role resolveLegacyRole(String roleCode) {
        if (roleCode == null) {
            return Role.SELLER;
        }
        try {
            return Role.valueOf(roleCode);
        } catch (IllegalArgumentException ex) {
            log.debug("Role code '{}' is not in legacy enum, using SELLER for legacy field", roleCode);
            return Role.SELLER;
        }
    }

    /**
     * Generates a unique username from full name in format: a.karimov
     * If taken, tries al.karimov, ali.karimov, then a.karimov1, a.karimov2...
     *
     * @param fullName The full name of the person
     * @return A unique username
     */
    public String generateUsername(String fullName) {
        // Normalize and clean the name
        String normalized = Normalizer.normalize(fullName.toLowerCase().trim(), Normalizer.Form.NFD)
                .replaceAll("[^\\p{ASCII}]", ""); // Remove non-ASCII chars

        String[] parts = normalized.split("\\s+");
        if (parts.length < 2) {
            // Single name - use the whole name
            return generateUniqueUsername(normalized, "");
        }

        String firstName = parts[0];
        String lastName = parts[parts.length - 1];

        // Try a.karimov format
        for (int prefixLen = 1; prefixLen <= Math.min(firstName.length(), 5); prefixLen++) {
            String prefix = firstName.substring(0, prefixLen);
            String candidate = prefix + "." + lastName;

            if (!userRepository.existsByUsername(candidate)) {
                return candidate;
            }
        }

        // If all prefix variations taken, add numbers
        String baseUsername = firstName.charAt(0) + "." + lastName;
        int counter = 1;
        while (true) {
            String candidate = baseUsername + counter;
            if (!userRepository.existsByUsername(candidate)) {
                return candidate;
            }
            counter++;
            if (counter > 1000) {
                throw new IllegalStateException("Username generatsiya qilib bo'lmadi: " + fullName);
            }
        }
    }

    private String generateUniqueUsername(String base, String suffix) {
        String candidate = base + suffix;
        if (!userRepository.existsByUsername(candidate)) {
            return candidate;
        }

        int counter = 1;
        while (true) {
            candidate = base + counter;
            if (!userRepository.existsByUsername(candidate)) {
                return candidate;
            }
            counter++;
            if (counter > 1000) {
                throw new IllegalStateException("Username generatsiya qilib bo'lmadi");
            }
        }
    }

    /**
     * Generates a strong temporary password.
     * Format: 8 characters with uppercase, lowercase, digits, and special char.
     *
     * @return Generated password
     */
    public String generateTemporaryPassword() {
        StringBuilder password = new StringBuilder(8);

        // Ensure at least one of each type
        password.append(PASSWORD_CHARS_UPPER.charAt(RANDOM.nextInt(PASSWORD_CHARS_UPPER.length())));
        password.append(PASSWORD_CHARS_LOWER.charAt(RANDOM.nextInt(PASSWORD_CHARS_LOWER.length())));
        password.append(PASSWORD_CHARS_DIGITS.charAt(RANDOM.nextInt(PASSWORD_CHARS_DIGITS.length())));
        password.append(PASSWORD_CHARS_SPECIAL.charAt(RANDOM.nextInt(PASSWORD_CHARS_SPECIAL.length())));

        // Fill remaining with mix
        String allChars = PASSWORD_CHARS_UPPER + PASSWORD_CHARS_LOWER + PASSWORD_CHARS_DIGITS;
        for (int i = 4; i < 8; i++) {
            password.append(allChars.charAt(RANDOM.nextInt(allChars.length())));
        }

        // Shuffle the password
        char[] chars = password.toString().toCharArray();
        for (int i = chars.length - 1; i > 0; i--) {
            int j = RANDOM.nextInt(i + 1);
            char temp = chars[i];
            chars[i] = chars[j];
            chars[j] = temp;
        }

        return new String(chars);
    }

    /**
     * Changes user password after validating current password.
     *
     * @param userId User ID
     * @param currentPassword Current password for verification
     * @param newPassword New password to set
     */
    @Transactional
    public void changePassword(Long userId, String currentPassword, String newPassword) {
        // Fetch with roles for proper audit logging
        User user = userRepository.findByIdWithRolesAndPermissions(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Foydalanuvchi topilmadi"));

        // Verify current password
        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new IllegalArgumentException("Joriy parol noto'g'ri");
        }

        // Validate new password
        validatePassword(newPassword);

        // Update password
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setMustChangePassword(false);
        user.setPasswordChangedAt(LocalDateTime.now());
        userRepository.save(user);

        auditLogService.log(
                "User",
                userId,
                "PASSWORD_CHANGED",
                null,
                "Foydalanuvchi parolini o'zgartirdi",
                userId
        );

        log.info("Password changed for user: {}", user.getUsername());
    }

    /**
     * Resets user password (admin action) and forces password change.
     *
     * @param userId User ID to reset
     * @return CredentialsInfo with new temporary password
     */
    @Transactional
    public CredentialsInfo resetPassword(Long userId) {
        // Fetch with roles for proper audit logging
        User user = userRepository.findByIdWithRolesAndPermissions(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Foydalanuvchi topilmadi"));

        String temporaryPassword = generateTemporaryPassword();
        user.setPassword(passwordEncoder.encode(temporaryPassword));
        user.setMustChangePassword(true);
        userRepository.save(user);

        User currentUser = getCurrentUser();
        auditLogService.log(
                "User",
                userId,
                "PASSWORD_RESET",
                null,
                String.format("Admin tomonidan parol reset qilindi: %s", user.getUsername()),
                currentUser != null ? currentUser.getId() : null
        );

        log.info("Password reset by admin for user: {}", user.getUsername());

        return CredentialsInfo.builder()
                .username(user.getUsername())
                .temporaryPassword(temporaryPassword)
                .message("Yangi vaqtinchalik parol. Xodimga yetkazing!")
                .mustChangePassword(true)
                .build();
    }

    /**
     * Deactivates a user account.
     *
     * @param userId User ID to deactivate
     */
    @Transactional
    public void deactivateUser(Long userId) {
        // Fetch with roles for proper audit logging
        User user = userRepository.findByIdWithRolesAndPermissions(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Foydalanuvchi topilmadi"));

        user.setActive(false);
        userRepository.save(user);

        User currentUser = getCurrentUser();
        auditLogService.log(
                "User",
                userId,
                "USER_DEACTIVATED",
                null,
                String.format("User o'chirildi: %s", user.getUsername()),
                currentUser != null ? currentUser.getId() : null
        );

        log.info("User deactivated: {}", user.getUsername());
    }

    /**
     * Activates a user account.
     *
     * @param userId User ID to activate
     */
    @Transactional
    public void activateUser(Long userId) {
        // Fetch with roles for proper audit logging
        User user = userRepository.findByIdWithRolesAndPermissions(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Foydalanuvchi topilmadi"));

        user.setActive(true);
        userRepository.save(user);

        User currentUser = getCurrentUser();
        auditLogService.log(
                "User",
                userId,
                "USER_ACTIVATED",
                null,
                String.format("User aktivlashtirildi: %s", user.getUsername()),
                currentUser != null ? currentUser.getId() : null
        );

        log.info("User activated: {}", user.getUsername());
    }

    /**
     * Gets user by ID.
     *
     * @param userId User ID
     * @return User entity
     */
    public User getUserById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Foydalanuvchi topilmadi"));
    }

    /**
     * Gets user by username.
     *
     * @param username Username
     * @return User entity
     */
    public User getUserByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Foydalanuvchi topilmadi"));
    }

    /**
     * Get all role codes for a user
     *
     * @param userId User ID
     * @return Set of role codes
     */
    @Transactional(readOnly = true)
    public Set<String> getUserRoles(Long userId) {
        return userRepository.findById(userId)
                .map(user -> user.getRoles().stream()
                        .map(RoleEntity::getCode)
                        .collect(Collectors.toSet()))
                .orElse(Collections.emptySet());
    }

    /**
     * Search users with pagination, optional search text and active filter.
     */
    @Transactional(readOnly = true)
    public Page<UserDetailResponse> searchUsers(String search, Boolean active, Pageable pageable) {
        Page<User> users;

        boolean hasSearch = search != null && !search.isBlank();
        boolean hasActiveFilter = active != null;

        if (hasSearch && hasActiveFilter) {
            users = userRepository.searchUsersByActive(search.trim(), active, pageable);
        } else if (hasSearch) {
            users = userRepository.searchUsers(search.trim(), pageable);
        } else if (hasActiveFilter) {
            users = userRepository.findByActive(active, pageable);
        } else {
            users = userRepository.findAll(pageable);
        }

        return users.map(UserDetailResponse::simpleFrom);
    }

    /**
     * Get user details by ID (with roles, createdBy, familyGroup eager loaded).
     */
    @Transactional(readOnly = true)
    public UserDetailResponse getUserDetails(Long userId) {
        User user = userRepository.findByIdWithDetails(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Foydalanuvchi topilmadi"));
        return UserDetailResponse.from(user);
    }

    /**
     * Update user profile details (fullName, email, phone).
     */
    @Transactional
    public UserDetailResponse updateUser(Long userId, UpdateUserRequest request) {
        User user = userRepository.findByIdWithDetails(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Foydalanuvchi topilmadi"));

        user.setFullName(request.getFullName());
        user.setEmail(request.getEmail());
        user.setPhone(request.getPhone());
        userRepository.save(user);

        User currentUser = getCurrentUser();
        auditLogService.log(
                "User",
                userId,
                "USER_UPDATED",
                null,
                String.format("Foydalanuvchi yangilandi: %s", user.getUsername()),
                currentUser != null ? currentUser.getId() : null
        );

        log.info("User updated: {}", user.getUsername());

        return UserDetailResponse.from(user);
    }

    private User getCurrentUser() {
        try {
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            return userRepository.findByUsername(username).orElse(null);
        } catch (Exception e) {
            return null;
        }
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
}
