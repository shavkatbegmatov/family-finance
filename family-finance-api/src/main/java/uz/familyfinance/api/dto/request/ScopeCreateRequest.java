package uz.familyfinance.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;
import uz.familyfinance.api.enums.ScopeType;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Yangi scope yaratish so'rovi.
 *
 * <p>{@code parentScopeId} CLAN dan tashqari hammasida majburiy.
 * {@code metadata} tur-specifik ma'lumotlar uchun (masalan EVENT uchun
 * {@code expectedBudget}, PROPERTY uchun {@code shareholders[]}).</p>
 */
@Data
public class ScopeCreateRequest {

    @NotNull(message = "Scope turi tanlanishi shart")
    private ScopeType type;

    @NotBlank(message = "Nom kiritilishi shart")
    @Size(min = 1, max = 150, message = "Nom 1-150 belgi orasida bo'lishi kerak")
    private String name;

    /** CLAN uchun null, qolganlari uchun majburiy. */
    private Long parentScopeId;

    /** Tur-specifik konfiguratsiya — JSONB sifatida saqlanadi. */
    private Map<String, Object> metadata;

    private LocalDateTime startsAt;

    private LocalDateTime endsAt;
}
