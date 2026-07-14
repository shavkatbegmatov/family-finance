package uz.familyfinance.api.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.TextNode;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import uz.familyfinance.api.dto.response.ApiResponse;
import uz.familyfinance.api.dto.response.TelegramDiagnosticsResponse;
import uz.familyfinance.api.security.RequiresSuperAdmin;
import uz.familyfinance.api.service.telegram.TelegramBotClient;
import uz.familyfinance.api.service.telegram.TelegramPollingHealth;

import java.util.function.Supplier;

/**
 * Telegram bot diagnostikasi (SUPER_ADMIN) — long-polling holati va live bot tekshiruvi.
 * Prod'da "bot javob bermayapti" muammosining sababini loglarsiz aniqlash uchun.
 */
@RestController
@RequestMapping("/v1/admin/telegram")
@RequiredArgsConstructor
@Tag(name = "Telegram Admin", description = "Telegram bot diagnostikasi (superadmin)")
public class TelegramAdminController {

    private final TelegramBotClient botClient;
    private final TelegramPollingHealth health;

    @Value("${app.telegram.bot-username:}")
    private String botUsername;

    @GetMapping("/diagnostics")
    @RequiresSuperAdmin
    @Operation(summary = "Telegram diagnostics",
            description = "Polling holati + live getMe/getWebhookInfo (token va webhook tekshiruvi)")
    public ResponseEntity<ApiResponse<TelegramDiagnosticsResponse>> diagnostics() {
        TelegramDiagnosticsResponse.TelegramDiagnosticsResponseBuilder builder =
                TelegramDiagnosticsResponse.builder()
                        .enabled(botClient.isEnabled())
                        .botUsername(botUsername)
                        .lastPollOkAt(health.getLastOkAt())
                        .lastPollErrorAt(health.getLastErrorAt())
                        .lastPollError(health.getLastError())
                        .consecutiveErrors(health.getConsecutiveErrors().get())
                        .updatesProcessed(health.getUpdatesProcessed().get());

        if (botClient.isEnabled()) {
            builder.getMe(liveCall(botClient::getMe));
            builder.webhookInfo(liveCall(botClient::getWebhookInfo));
        }
        return ResponseEntity.ok(ApiResponse.success(builder.build()));
    }

    /** Live Telegram chaqiruvi — xato ham diagnostika (matn sifatida qaytadi, endpoint yiqilmaydi). */
    private static JsonNode liveCall(Supplier<JsonNode> call) {
        try {
            return call.get();
        } catch (Exception e) {
            return TextNode.valueOf("XATO: " + e.getMessage());
        }
    }
}
