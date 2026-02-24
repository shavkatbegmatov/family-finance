package uz.familyfinance.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.familyfinance.api.annotation.ExportColumn;
import uz.familyfinance.api.annotation.ExportColumn.ColumnType;
import uz.familyfinance.api.annotation.ExportEntity;
import uz.familyfinance.api.entity.RoleEntity;
import uz.familyfinance.api.entity.User;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ExportEntity(sheetName = "Foydalanuvchilar", title = "Foydalanuvchilar Hisoboti")
public class UserDetailResponse {

    @ExportColumn(header = "ID", order = 1, type = ColumnType.NUMBER)
    private Long id;

    @ExportColumn(header = "Username", order = 2)
    private String username;

    @ExportColumn(header = "To'liq ism", order = 3)
    private String fullName;

    @ExportColumn(header = "Email", order = 4)
    private String email;

    @ExportColumn(header = "Telefon", order = 5)
    private String phone;

    @ExportColumn(header = "Faol", order = 6, type = ColumnType.BOOLEAN)
    private Boolean active;

    private Boolean mustChangePassword;

    @ExportColumn(header = "Parol o'zgartirilgan", order = 7, type = ColumnType.DATETIME)
    private LocalDateTime passwordChangedAt;

    @ExportColumn(header = "Rollar", order = 8)
    private String rolesText;

    private List<RoleSimple> roleDetails;

    @ExportColumn(header = "Yaratuvchi", order = 9)
    private String createdByUsername;

    private String familyGroupName;

    @ExportColumn(header = "Yaratilgan", order = 10, type = ColumnType.DATETIME)
    private LocalDateTime createdAt;

    @ExportColumn(header = "Yangilangan", order = 11, type = ColumnType.DATETIME)
    private LocalDateTime updatedAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RoleSimple {
        private Long id;
        private String name;
        private String code;
    }

    /**
     * Full mapping with roles, createdBy, familyGroup (requires eager fetch)
     */
    public static UserDetailResponse from(User user) {
        UserDetailResponseBuilder builder = UserDetailResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .active(user.getActive())
                .mustChangePassword(user.getMustChangePassword())
                .passwordChangedAt(user.getPasswordChangedAt())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt());

        if (user.getRoles() != null && !user.getRoles().isEmpty()) {
            builder.rolesText(user.getRoles().stream()
                    .map(RoleEntity::getName)
                    .sorted()
                    .collect(Collectors.joining(", ")));
            builder.roleDetails(user.getRoles().stream()
                    .map(r -> RoleSimple.builder()
                            .id(r.getId())
                            .name(r.getName())
                            .code(r.getCode())
                            .build())
                    .collect(Collectors.toList()));
        }

        if (user.getCreatedBy() != null) {
            builder.createdByUsername(user.getCreatedBy().getFullName());
        }

        if (user.getFamilyGroup() != null) {
            builder.familyGroupName(user.getFamilyGroup().getName());
        }

        return builder.build();
    }

    /**
     * Simple mapping without lazy associations (safe for list queries)
     */
    public static UserDetailResponse simpleFrom(User user) {
        return UserDetailResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .active(user.getActive())
                .mustChangePassword(user.getMustChangePassword())
                .passwordChangedAt(user.getPasswordChangedAt())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}
