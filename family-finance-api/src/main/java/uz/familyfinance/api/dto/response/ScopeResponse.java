package uz.familyfinance.api.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.familyfinance.api.entity.Scope;
import uz.familyfinance.api.enums.ScopeRole;
import uz.familyfinance.api.enums.ScopeType;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ScopeResponse {

    private Long id;
    private ScopeType type;
    private String name;
    private Long parentScopeId;
    private String parentScopeName;
    private Long ownerUserId;
    private String ownerUserName;
    private String uniqueCode;
    private Map<String, Object> metadata;
    private LocalDateTime startsAt;
    private LocalDateTime endsAt;
    private Boolean isActive;
    private LocalDateTime createdAt;

    /** Joriy user'ning shu scope'dagi roli (null bo'lsa membership yo'q yoki SUPER_ADMIN). */
    private ScopeRole currentUserRole;

    /** Aktiv a'zolar soni. */
    private Long memberCount;

    public static ScopeResponse from(Scope scope) {
        return ScopeResponse.builder()
                .id(scope.getId())
                .type(scope.getType())
                .name(scope.getName())
                .parentScopeId(scope.getParentScope() != null ? scope.getParentScope().getId() : null)
                .parentScopeName(scope.getParentScope() != null ? scope.getParentScope().getName() : null)
                .ownerUserId(scope.getOwnerUser() != null ? scope.getOwnerUser().getId() : null)
                .ownerUserName(scope.getOwnerUser() != null ? scope.getOwnerUser().getFullName() : null)
                .uniqueCode(scope.getUniqueCode())
                .metadata(scope.getMetadata())
                .startsAt(scope.getStartsAt())
                .endsAt(scope.getEndsAt())
                .isActive(scope.getIsActive())
                .createdAt(scope.getCreatedAt())
                .build();
    }
}
