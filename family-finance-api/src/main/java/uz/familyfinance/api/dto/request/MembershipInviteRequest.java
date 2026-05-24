package uz.familyfinance.api.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import uz.familyfinance.api.enums.ScopeRole;

/**
 * Scope'ga user'ni a'zo qilib qo'shish so'rovi.
 *
 * <p>Faqat OWNER yoki ADMIN tomonidan bajariladi. Yangi membership avtomatik
 * ACTIVE statusda yaratiladi (Phase 2 da PENDING-with-approval flow qo'shilishi mumkin).</p>
 */
@Data
public class MembershipInviteRequest {

    @NotNull(message = "User ID kiritilishi shart")
    private Long userId;

    @NotNull(message = "Rol tanlanishi shart")
    private ScopeRole role;
}
