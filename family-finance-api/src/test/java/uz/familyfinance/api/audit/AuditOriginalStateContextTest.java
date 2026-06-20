package uz.familyfinance.api.audit;

import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * D5: {@link AuditOriginalStateContext} (so'rov-ko'lamli ThreadLocal "asl holat" do'koni)
 * va {@link AuditContextCleanupFilter} (har so'rov oxirida tozalash) toza-mantiq testlari.
 *
 * Avvalgi static {@code ConcurrentHashMap} ikki bug'ga sabab edi: (1) <b>xotira oqishi</b>
 * (yozuvlar hech tozalanmasdi), (2) <b>cross-request poyga</b> (global kalit to'qnashardi).
 * Bu testlar put/remove semantikasi, clear, THREAD-IZOLYATSIYA (poyga himoyasi) va filter
 * {@code finally}'da tozalashni qulflaydi. Spring/DB kerak emas → gating surefire'da, tez.
 */
@DisplayName("AuditOriginalStateContext + CleanupFilter (D5 xotira-oqishi/poyga)")
class AuditOriginalStateContextTest {

    @AfterEach
    void cleanup() {
        AuditOriginalStateContext.clear();
    }

    @Test
    @DisplayName("put -> remove asl holatni qaytaradi; ikkinchi remove null (bir marta ishlatiladi)")
    void putThenRemove() {
        AuditOriginalStateContext.put("User:1", Map.of("name", "Eski"));
        assertThat(AuditOriginalStateContext.remove("User:1")).containsEntry("name", "Eski");
        assertThat(AuditOriginalStateContext.remove("User:1")).isNull();
    }

    @Test
    @DisplayName("clear butun do'konni bo'shatadi (xotira oqishi fix)")
    void clearEmptiesStore() {
        AuditOriginalStateContext.put("User:1", Map.of("name", "Eski"));
        AuditOriginalStateContext.put("Account:9", Map.of("balance", "100"));
        AuditOriginalStateContext.clear();
        assertThat(AuditOriginalStateContext.remove("User:1")).isNull();
        assertThat(AuditOriginalStateContext.remove("Account:9")).isNull();
    }

    @Test
    @DisplayName("yozuvlar thread'lar bo'ylab izolyatsiya qilingan (cross-request poyga fix)")
    void isolatedAcrossThreads() throws InterruptedException {
        AuditOriginalStateContext.put("User:1", Map.of("v", "main-thread"));

        AtomicReference<Map<String, Object>> seenInOtherThread = new AtomicReference<>(Map.of("sentinel", "x"));
        Thread other = new Thread(() -> seenInOtherThread.set(AuditOriginalStateContext.remove("User:1")));
        other.start();
        other.join();

        // Boshqa thread main-thread yozuvini KO'RMAYDI (alohida ThreadLocal) → to'qnashuv yo'q
        assertThat(seenInOtherThread.get()).isNull();
        // Main thread'da yozuv hali ham bor — boshqa thread remove'i ta'sir qilmadi
        assertThat(AuditOriginalStateContext.remove("User:1")).containsEntry("v", "main-thread");
    }

    @Test
    @DisplayName("CleanupFilter zanjirdan keyin do'konni finally'da tozalaydi")
    void filterClearsAfterChain() throws Exception {
        AuditContextCleanupFilter filter = new AuditContextCleanupFilter();
        AuditOriginalStateContext.put("User:1", Map.of("before", "chain"));

        FilterChain chain = (req, res) ->
                // Zanjir ichida (controller entity yuklagandek) yangi yozuv qo'shamiz
                AuditOriginalStateContext.put("Account:9", Map.of("during", "chain"));
        filter.doFilter(new MockHttpServletRequest(), new MockHttpServletResponse(), chain);

        // finally tozaladi — hech narsa qolmaydi (thread-pool gigienasi)
        assertThat(AuditOriginalStateContext.remove("User:1")).isNull();
        assertThat(AuditOriginalStateContext.remove("Account:9")).isNull();
    }
}
