package uz.familyfinance.api.service.telegram;

import lombok.Getter;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Long-polling holat kuzatuvi — prod'da bot "jim" qolganda sababni ko'rish uchun
 * (yozuvchi: polling threadi, o'quvchi: diagnostika endpointi).
 */
@Component
@Getter
public class TelegramPollingHealth {

    private volatile LocalDateTime lastOkAt;
    private volatile LocalDateTime lastErrorAt;
    private volatile String lastError;

    private final AtomicLong consecutiveErrors = new AtomicLong();
    private final AtomicLong updatesProcessed = new AtomicLong();

    /** Muvaffaqiyatli poll — xato seriyasi uziladi. */
    public void recordOk() {
        lastOkAt = LocalDateTime.now();
        consecutiveErrors.set(0);
    }

    /** Xato — matni saqlanadi, seriya hisoblanadi. Qaytgan qiymat: seriyadagi tartib raqami. */
    public long recordError(String message) {
        lastErrorAt = LocalDateTime.now();
        lastError = message;
        return consecutiveErrors.incrementAndGet();
    }

    public void recordUpdateProcessed() {
        updatesProcessed.incrementAndGet();
    }
}
