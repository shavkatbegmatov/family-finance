package uz.familyfinance.api.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import uz.familyfinance.api.exception.BadRequestException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;

/**
 * "Have I Been Pwned" (HIBP) buzilgan-parol tekshiruvi — k-anonymity modeli bilan.
 *
 * <p>Parol HECH QACHON tashqariga yuborilmaydi: SHA-1 hash hisoblanadi, faqat dastlabki 5 belgi
 * (prefix) {@code api.pwnedpasswords.com} ga ketadi; qolgan 35 belgi (suffix) javob ichida
 * lokal solishtiriladi.</p>
 *
 * <p><b>Fail-open:</b> HIBP yetib bo'lmasa (timeout/tarmoq/xato) — parol RAD ETILMAYDI, faqat
 * {@code log.warn}. Sabab: HIBP tashqi, ixtiyoriy qatlam; uzilishi self-service ro'yxatdan
 * o'tish/parol o'zgartirishni bloklamasligi kerak. Asosiy qoidalar (uzunlik+murakkablik) baribir
 * {@link uz.familyfinance.api.util.PasswordPolicy} da majburiy.</p>
 */
@Service
@Slf4j
public class PwnedPasswordService {

    private static final String HIBP_RANGE_BASE_URL = "https://api.pwnedpasswords.com/range/";
    private static final Duration TIMEOUT = Duration.ofSeconds(3);

    private final RestClient restClient;
    private final boolean enabled;

    public PwnedPasswordService(
            RestClient.Builder restClientBuilder,
            @Value("${app.security.hibp.enabled:true}") boolean enabled) {
        this.enabled = enabled;

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(TIMEOUT);
        factory.setReadTimeout(TIMEOUT);

        this.restClient = restClientBuilder
                .baseUrl(HIBP_RANGE_BASE_URL)
                .requestFactory(factory)
                // Add-Padding: javobni teng uzunlikka to'ldiradi (so'rovdan parolni chiqarib bo'lmaydi)
                .defaultHeader("Add-Padding", "true")
                .defaultHeader("User-Agent", "family-finance-api")
                .build();
    }

    /**
     * Parol buzilgan-ro'yxatda bo'lsa {@link BadRequestException} (400) tashlaydi.
     * Tekshiruv imkonsiz bo'lsa jim o'tkazadi (fail-open).
     */
    public void assertNotPwned(String password) {
        if (isPwned(password)) {
            throw new BadRequestException(
                    "Bu parol ommaviy ma'lumotlar sizishida topilgan — boshqa, noyob parol tanlang");
        }
    }

    /**
     * @return parol HIBP buzilgan-ro'yxatida topilsa {@code true}; o'chirilgan yoki tekshiruv
     * imkonsiz bo'lsa {@code false} (fail-open)
     */
    public boolean isPwned(String password) {
        if (!enabled || password == null || password.isEmpty()) {
            return false;
        }
        try {
            String sha1 = sha1Hex(password);
            String prefix = sha1.substring(0, 5);
            String suffix = sha1.substring(5);

            String body = restClient.get()
                    .uri(prefix)
                    .retrieve()
                    .body(String.class);

            return containsSuffix(body, suffix);
        } catch (Exception e) {
            // Fail-open: HIBP yetib bo'lmasa parolni bloklamaymiz
            log.warn("HIBP tekshiruvi imkonsiz (fail-open): {}", e.getMessage());
            return false;
        }
    }

    /**
     * HIBP range javobida ({@code SUFFIX:COUNT} qatorlar) berilgan suffiks bor-yo'qligini tekshiradi.
     * Padding qatorlari ({@code COUNT=0}) buzilgan hisoblanmaydi.
     */
    static boolean containsSuffix(String body, String suffix) {
        if (body == null || body.isBlank()) {
            return false;
        }
        for (String line : body.split("\\r?\\n")) {
            int colon = line.indexOf(':');
            if (colon <= 0) {
                continue;
            }
            if (suffix.equalsIgnoreCase(line.substring(0, colon).trim())) {
                String count = line.substring(colon + 1).trim();
                return !count.isEmpty() && !"0".equals(count);
            }
        }
        return false;
    }

    /** Parolning SHA-1 hash'i — katta harfli hex (HIBP range API formati). */
    static String sha1Hex(String input) throws NoSuchAlgorithmException {
        MessageDigest md = MessageDigest.getInstance("SHA-1");
        byte[] digest = md.digest(input.getBytes(StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder(digest.length * 2);
        for (byte b : digest) {
            sb.append(Character.forDigit((b >> 4) & 0xF, 16));
            sb.append(Character.forDigit(b & 0xF, 16));
        }
        return sb.toString().toUpperCase();
    }
}
