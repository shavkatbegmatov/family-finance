package uz.familyfinance.api.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import uz.familyfinance.api.enums.ScopeRole;

/**
 * Scope'ga user'ni a'zo qilib qo'shish so'rovi.
 *
 * <p>Quyidagilardan biri kerak: {@code userId} (mavjud user ID) yoki {@code username}
 * (qidirish uchun). Yangi membership PENDING statusda yaratiladi — user qabul
 * qilgandan keyin ACTIVE bo'ladi.</p>
 */
@Data
public class MembershipInviteRequest {

    /** Mavjud user ID — birovni ID orqali taklif qilish uchun. */
    private Long userId;

    /** Mavjud user username — qidiruv orqali taklif qilish uchun. */
    private String username;

    @NotNull(message = "Rol tanlanishi shart")
    private ScopeRole role;

    /** PENDING (default — taklif qabul kutilmoqda) yoki ACTIVE (admin majbur qo'shdi). */
    private Boolean requireAcceptance = true;
}
