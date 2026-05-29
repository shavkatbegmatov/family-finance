package uz.familyfinance.api.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.familyfinance.api.enums.ScopeRole;
import uz.familyfinance.api.enums.ScopeType;

/**
 * Aktiv scope o'zgartirishdan keyin qaytariladigan javob.
 * Yangi JWT token va aktiv scope haqida ma'lumot.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SwitchScopeResponse {

    private String accessToken;
    private String tokenType;

    private Long activeScopeId;
    private String activeScopeName;
    private ScopeType activeScopeType;
    private ScopeRole currentUserRole;
}
