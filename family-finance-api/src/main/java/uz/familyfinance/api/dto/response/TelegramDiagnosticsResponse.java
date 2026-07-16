package uz.familyfinance.api.dto.response;

import tools.jackson.databind.JsonNode;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Telegram bot long-polling diagnostikasi (superadmin) — prod'da bot "jim" qolganda
 * sababni API orqali ko'rish uchun: token yaroqsiz (401), webhook/parallel iste'molchi (409)
 * yoki polling umuman o'chiq.
 */
@Data
@Builder
public class TelegramDiagnosticsResponse {

    /** app.telegram.enabled && token mavjud — polling ishga tushirilganmi. */
    private boolean enabled;

    private String botUsername;

    /** Oxirgi muvaffaqiyatli getUpdates vaqti (null — hech qachon bo'lmagan). */
    private LocalDateTime lastPollOkAt;

    private LocalDateTime lastPollErrorAt;

    /** Oxirgi xato matni (HTTP status + Telegram javobi) — 401/409 shu yerda ko'rinadi. */
    private String lastPollError;

    private long consecutiveErrors;

    private long updatesProcessed;

    /** Live getMe natijasi — token yaroqliligi (xato bo'lsa matni). */
    private JsonNode getMe;

    /** Live getWebhookInfo natijasi — webhook o'rnatilib qolgan bo'lsa shu ko'rsatadi. */
    private JsonNode webhookInfo;
}
