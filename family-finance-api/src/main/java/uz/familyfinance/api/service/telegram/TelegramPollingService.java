package uz.familyfinance.api.service.telegram;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientResponseException;
import uz.familyfinance.api.service.TelegramAuthService;

import java.util.concurrent.atomic.AtomicLong;

/**
 * Telegram bot long-polling. Har poll {@code getUpdates} (25s server-timeout) chaqiradi va
 * {@code /start <requestId>} xabarlarini {@link TelegramAuthService#confirm} ga uzatadi.
 *
 * <p>Offset xotirada ({@link AtomicLong}) — bitta backend instance uchun. {@code app.telegram.enabled=false}
 * (yoki token yo'q) bo'lsa to'liq o'chiq — dev fallback, qo'shimcha infratuzilma shart emas.</p>
 *
 * <p>Self-healing: startup'da {@code deleteWebhook} (webhook o'rnatilib qolsa getUpdates 409 bilan
 * abadiy bloklanadi); 409 "webhook is active" ko'rilganda ham qayta o'chiriladi. Holat
 * {@link TelegramPollingHealth}'da — superadmin diagnostika endpointi o'qiydi.</p>
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class TelegramPollingService {

    private final TelegramBotClient botClient;
    private final TelegramAuthService telegramAuthService;
    private final TelegramPollingHealth health;

    private final AtomicLong offset = new AtomicLong(0);
    private static final int POLL_TIMEOUT_SECONDS = 25;
    /** Xato seriyasida har nechanchi xato log'lanadi (500ms poll — aks holda log to'lib ketadi). */
    private static final long ERROR_LOG_EVERY = 100;

    private static final String NO_ARG_START_REPLY =
            "Kirish uchun ilovadagi \"Telegram orqali kirish\" tugmasini bosing — "
                    + "havola orqali kelganda tasdiqlash avtomatik bo'ladi.";

    /** Webhook o'rnatilib qolgan bo'lsa polling umuman ishlamaydi (409) — startup'da tozalaymiz. */
    @EventListener(ApplicationReadyEvent.class)
    public void clearWebhookOnStartup() {
        if (!botClient.isEnabled()) {
            log.info("Telegram polling O'CHIQ (app.telegram.enabled=false yoki token yo'q)");
            return;
        }
        try {
            JsonNode result = botClient.deleteWebhook();
            log.info("Telegram deleteWebhook (startup): {}", result);
        } catch (Exception e) {
            log.warn("Telegram deleteWebhook (startup) muvaffaqiyatsiz: {}", e.getMessage());
        }
    }

    @Scheduled(fixedDelay = 500)
    public void poll() {
        if (!botClient.isEnabled()) {
            return;
        }
        try {
            JsonNode response = botClient.getUpdates(offset.get(), POLL_TIMEOUT_SECONDS);
            if (response == null || !response.path("ok").asBoolean(false)) {
                handlePollError("getUpdates ok=false: " + response, null);
                return;
            }
            health.recordOk();
            for (JsonNode update : response.path("result")) {
                offset.set(update.path("update_id").asLong() + 1);
                handleUpdate(update);
            }
        } catch (RestClientResponseException e) {
            String detail = e.getStatusCode().value() + " " + e.getResponseBodyAsString();
            handlePollError(detail, e);
            if (e.getStatusCode().value() == 409 && detail.contains("webhook")) {
                tryDeleteWebhook();
            }
        } catch (Exception e) {
            handlePollError(e.getMessage(), e);
        }
    }

    /**
     * Xato seriyasining birinchisi va har {@value ERROR_LOG_EVERY}-chisi ERROR bilan log'lanadi —
     * 401 (token yaroqsiz) va 409 (webhook yoki parallel getUpdates iste'molchisi) shu yerda ko'rinadi.
     */
    private void handlePollError(String detail, Exception e) {
        long seq = health.recordError(detail);
        if (seq == 1 || seq % ERROR_LOG_EVERY == 0) {
            log.error("Telegram polling xatosi (ketma-ket {}): {}", seq, detail, e);
        }
    }

    private void tryDeleteWebhook() {
        try {
            JsonNode result = botClient.deleteWebhook();
            log.warn("Telegram webhook aniqlandi va o'chirildi (polling'ni blokdan chiqarish): {}", result);
        } catch (Exception ex) {
            log.warn("Telegram deleteWebhook muvaffaqiyatsiz: {}", ex.getMessage());
        }
    }

    private void handleUpdate(JsonNode update) {
        health.recordUpdateProcessed();
        JsonNode message = update.path("message");
        String text = message.path("text").asText("");
        if (!text.startsWith("/start")) {
            return;
        }
        long chatId = message.path("chat").path("id").asLong();
        String[] parts = text.split("\\s+", 2);
        if (parts.length < 2 || parts[1].isBlank()) {
            // Qo'lda yozilgan argumentsiz /start — jim qolish foydalanuvchini chalg'itadi
            botClient.sendMessage(chatId, NO_ARG_START_REPLY);
            return;
        }
        JsonNode from = message.path("from");
        TelegramUserInfo info = new TelegramUserInfo(
                from.path("id").asLong(),
                textOrNull(from, "first_name"),
                textOrNull(from, "last_name"),
                textOrNull(from, "username"),
                chatId);
        try {
            telegramAuthService.confirm(parts[1].trim(), info);
        } catch (Exception e) {
            log.warn("Telegram confirm xatosi (requestId={}): {}", parts[1].trim(), e.getMessage());
        }
    }

    private static String textOrNull(JsonNode node, String field) {
        JsonNode value = node.path(field);
        return value.isMissingNode() || value.isNull() ? null : value.asText();
    }
}
