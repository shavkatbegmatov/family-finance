package uz.familyfinance.api.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import uz.familyfinance.api.enums.ScopeRole;

/** Mavjud membership rolini o'zgartirish so'rovi. */
@Data
public class ScopeRoleUpdateRequest {

    @NotNull(message = "Yangi rol tanlanishi shart")
    private ScopeRole role;
}
