package uz.familyfinance.api.service.telegram;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.Map;

/**
 * Telegram Bot API uchun yengil HTTP klient (RestClient) — faqat 2 amal: long-polling
 * {@code getUpdates} va {@code sendMessage}. Naqsh: {@link uz.familyfinance.api.service.PwnedPasswordService}.
 *
 * <p>{@code app.telegram.enabled=false} yoki token bo'sh bo'lsa — {@link #isEnabled()} false
 * qaytaradi va polling umuman ishlamaydi (dev fallback, qo'shimcha kutubxona shart emas).</p>
 */
@Component
@Slf4j
public class TelegramBotClient {

    private final RestClient restClient;
    private final boolean enabled;

    public TelegramBotClient(
            RestClient.Builder restClientBuilder,
            @Value("${app.telegram.enabled:false}") boolean enabled,
            @Value("${app.telegram.bot-token:}") String botToken) {
        this.enabled = enabled && botToken != null && !botToken.isBlank();

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(10));
        // Read timeout long-polling timeout'idan kattaroq bo'lishi shart (aks holda har poll'da timeout).
        factory.setReadTimeout(Duration.ofSeconds(60));

        this.restClient = restClientBuilder
                .baseUrl("https://api.telegram.org/bot" + botToken)
                .requestFactory(factory)
                .build();
    }

    public boolean isEnabled() {
        return enabled;
    }

    /**
     * Long-polling {@code getUpdates}. {@code offset} = oxirgi qayta ishlangan {@code update_id + 1}.
     * Telegram javobi ({@code {ok, result:[...]}}) JsonNode sifatida qaytadi.
     */
    public JsonNode getUpdates(long offset, int timeoutSeconds) {
        return restClient.get()
                .uri(uriBuilder -> uriBuilder.path("/getUpdates")
                        .queryParam("offset", offset)
                        .queryParam("timeout", timeoutSeconds)
                        .build())
                .retrieve()
                .body(JsonNode.class);
    }

    /** Foydalanuvchiga matn yuborish (tasdiq xabari). Xato bo'lsa jim log (oqimni buzmaydi). */
    public void sendMessage(long chatId, String text) {
        try {
            restClient.post()
                    .uri("/sendMessage")
                    .body(Map.of("chat_id", chatId, "text", text))
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception e) {
            log.warn("Telegram sendMessage muvaffaqiyatsiz (chatId={}): {}", chatId, e.getMessage());
        }
    }
}
