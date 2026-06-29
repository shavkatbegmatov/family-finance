package uz.familyfinance.api.service.telegram;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import uz.familyfinance.api.service.TelegramAuthService;

import java.util.concurrent.atomic.AtomicLong;

/**
 * Telegram bot long-polling. Har poll {@code getUpdates} (25s server-timeout) chaqiradi va
 * {@code /start <requestId>} xabarlarini {@link TelegramAuthService#confirm} ga uzatadi.
 *
 * <p>Offset xotirada ({@link AtomicLong}) — bitta backend instance uchun. {@code app.telegram.enabled=false}
 * (yoki token yo'q) bo'lsa to'liq o'chiq — dev fallback, qo'shimcha infratuzilma shart emas.</p>
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class TelegramPollingService {

    private final TelegramBotClient botClient;
    private final TelegramAuthService telegramAuthService;

    private final AtomicLong offset = new AtomicLong(0);
    private static final int POLL_TIMEOUT_SECONDS = 25;

    @Scheduled(fixedDelay = 500)
    public void poll() {
        if (!botClient.isEnabled()) {
            return;
        }
        try {
            JsonNode response = botClient.getUpdates(offset.get(), POLL_TIMEOUT_SECONDS);
            if (response == null || !response.path("ok").asBoolean(false)) {
                return;
            }
            for (JsonNode update : response.path("result")) {
                offset.set(update.path("update_id").asLong() + 1);
                handleUpdate(update);
            }
        } catch (Exception e) {
            log.warn("Telegram polling xatosi: {}", e.getMessage());
        }
    }

    private void handleUpdate(JsonNode update) {
        JsonNode message = update.path("message");
        String text = message.path("text").asText("");
        if (!text.startsWith("/start")) {
            return;
        }
        String[] parts = text.split("\\s+", 2);
        if (parts.length < 2 || parts[1].isBlank()) {
            return; // argumentsiz /start — e'tiborsiz
        }
        JsonNode from = message.path("from");
        TelegramUserInfo info = new TelegramUserInfo(
                from.path("id").asLong(),
                textOrNull(from, "first_name"),
                textOrNull(from, "last_name"),
                textOrNull(from, "username"),
                message.path("chat").path("id").asLong());
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
