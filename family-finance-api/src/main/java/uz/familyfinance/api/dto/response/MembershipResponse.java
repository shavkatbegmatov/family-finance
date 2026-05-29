package uz.familyfinance.api.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.familyfinance.api.entity.ScopeMembership;
import uz.familyfinance.api.enums.MembershipStatus;
import uz.familyfinance.api.enums.ScopeRole;
import uz.familyfinance.api.enums.ScopeType;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class MembershipResponse {

    private Long id;
    private Long scopeId;
    private String scopeName;
    private ScopeType scopeType;
    private Long userId;
    private String userName;
    private String userFullName;
    private ScopeRole role;
    private MembershipStatus status;
    private LocalDateTime joinedAt;
    private Long invitedByUserId;
    private String invitedByName;

    public static MembershipResponse from(ScopeMembership m) {
        return MembershipResponse.builder()
                .id(m.getId())
                .scopeId(m.getScope() != null ? m.getScope().getId() : null)
                .scopeName(m.getScope() != null ? m.getScope().getName() : null)
                .scopeType(m.getScope() != null ? m.getScope().getType() : null)
                .userId(m.getUser() != null ? m.getUser().getId() : null)
                .userName(m.getUser() != null ? m.getUser().getUsername() : null)
                .userFullName(m.getUser() != null ? m.getUser().getFullName() : null)
                .role(m.getRole())
                .status(m.getStatus())
                .joinedAt(m.getJoinedAt())
                .invitedByUserId(m.getInvitedBy() != null ? m.getInvitedBy().getId() : null)
                .invitedByName(m.getInvitedBy() != null ? m.getInvitedBy().getFullName() : null)
                .build();
    }
}
