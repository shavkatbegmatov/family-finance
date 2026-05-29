package uz.familyfinance.api.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

/** Foydalanuvchi aktiv scope'ni o'zgartirish so'rovi (POST /v1/auth/switch-scope). */
@Data
public class SwitchScopeRequest {

    @NotNull(message = "Yangi scope ID kiritilishi shart")
    private Long scopeId;

    /**
     * True bo'lsa, {@code User.primaryScope} ham yangilanadi (kelgusi login'larda
     * default sifatida shu scope qoladi). False bo'lsa, faqat joriy sessiya uchun.
     */
    private Boolean persistAsPrimary = false;
}
