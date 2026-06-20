package uz.familyfinance.api.audit;

import java.util.HashMap;
import java.util.Map;

/**
 * So'rov ko'lamidagi (ThreadLocal) "asl holat" do'koni — {@link AuditEntityListener}
 * UPDATE diff'ini (eski vs yangi) hisoblash uchun entity'ning {@code @PostLoad} paytidagi
 * holatini shu yerda saqlaydi.
 *
 * <p><b>Nega ThreadLocal (D5 tuzatishi):</b> avval bu {@code static ConcurrentHashMap} edi.
 * {@code @PostLoad} har Auditable entity yuklanganda yozardi, lekin yozuv faqat
 * {@code @PreUpdate}/{@code @PreRemove}da o'chardi. O'qilgan-yu yangilanmagan (aksariyat)
 * entity'lar map'da <b>abadiy</b> qolib — DB hajmi bo'ylab o'sadigan <b>xotira oqishi</b>;
 * bundan tashqari global kalit ({@code EntityClass:Id}) parallel so'rovlarda <b>to'qnashib</b>
 * <b>poyga</b> hosil qilardi: bir so'rovning {@code @PostLoad}'i boshqasinikini ustiga yozib,
 * audit "eski qiymat" noto'g'ri yoki yo'qolib qolardi.</p>
 *
 * <p>ThreadLocal har so'rovni (thread'ni) izolyatsiya qiladi → cross-request to'qnashuv yo'q.
 * {@link AuditContextCleanupFilter} har so'rov oxirida {@link #clear()} chaqirib, qayta
 * ishlatiladigan thread-pool thread'larida yozuv qolib ketmasligini ta'minlaydi.</p>
 */
public final class AuditOriginalStateContext {

    private static final ThreadLocal<Map<String, Map<String, Object>>> STORE =
            ThreadLocal.withInitial(HashMap::new);

    private AuditOriginalStateContext() {
        // Utility klass — instansiya yaratib bo'lmaydi
    }

    /** Entity'ning asl holatini saqlaydi ({@code @PostLoad}da). */
    public static void put(String key, Map<String, Object> originalState) {
        STORE.get().put(key, originalState);
    }

    /**
     * Saqlangan asl holatni qaytaradi va do'kondan o'chiradi (UPDATE/DELETE bir marta
     * ishlatadi). Yo'q bo'lsa {@code null}.
     */
    public static Map<String, Object> remove(String key) {
        return STORE.get().remove(key);
    }

    /**
     * Joriy thread'ning butun so'rov-do'konini tozalaydi (xotira oqishini oldini olish
     * uchun har so'rov oxirida chaqiriladi).
     */
    public static void clear() {
        STORE.remove();
    }
}
