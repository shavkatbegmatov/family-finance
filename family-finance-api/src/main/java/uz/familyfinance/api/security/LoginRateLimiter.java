package uz.familyfinance.api.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * C6: Login endpoint uchun IP-asosli sodda rate-limiter (in-memory, fixed-window).
 *
 * Maqsad: brute-force / login DoS'ni to'sish. Bu LoginAttemptService'ning per-username
 * lockout'iga QO'SHIMCHA qatlam (IP darajasida, har so'rovga). Tashqi dependency yo'q —
 * bitta instans uchun yetarli (ko'p-instansda Redis kerak bo'lardi).
 *
 * Default GENEROUS (30/min/IP): legitim foydalanuvchilar (hatto bitta IP ortidagi bir
 * nechta — korporativ NAT) bloklanmaydi, lekin brute-force (yuzlab/min) to'siladi. Barcha
 * qiymatlar `app.login-rate-limit.*` orqali sozlanadi; `enabled=false` butunlay o'chiradi.
 */
@Component
@Slf4j
public class LoginRateLimiter {

    @Value("${app.login-rate-limit.enabled:true}")
    private boolean enabled;

    @Value("${app.login-rate-limit.max-attempts:30}")
    private int maxAttempts;

    @Value("${app.login-rate-limit.window-seconds:60}")
    private long windowSeconds;

    private final Map<String, Counter> counters = new ConcurrentHashMap<>();

    /**
     * @return true — ruxsat; false — oyna ichida limit oshib ketdi (chaqiruvchi 429 qaytarsin).
     */
    public boolean allow(String key) {
        if (!enabled || key == null || key.isBlank()) {
            return true;
        }
        long now = System.currentTimeMillis();
        long windowMs = windowSeconds * 1000L;
        Counter counter = counters.compute(key, (k, existing) -> {
            if (existing == null || now - existing.windowStart >= windowMs) {
                return new Counter(now);
            }
            existing.count++;
            return existing;
        });
        boolean allowed = counter.count <= maxAttempts;
        if (!allowed) {
            log.warn("Login rate limit oshib ketdi: key={} ({} > {}/{}s)", key, counter.count, maxAttempts, windowSeconds);
        }
        return allowed;
    }

    /** Eskirgan oynalarni tozalash (xotira o'sishini oldini oladi). */
    @Scheduled(fixedDelay = 600_000L)
    public void cleanupExpired() {
        long now = System.currentTimeMillis();
        long windowMs = windowSeconds * 1000L;
        counters.entrySet().removeIf(e -> now - e.getValue().windowStart >= windowMs);
    }

    private static final class Counter {
        final long windowStart;
        int count;

        Counter(long windowStart) {
            this.windowStart = windowStart;
            this.count = 1;
        }
    }
}
