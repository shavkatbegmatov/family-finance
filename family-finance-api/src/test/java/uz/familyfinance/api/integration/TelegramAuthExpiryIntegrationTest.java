package uz.familyfinance.api.integration;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import uz.familyfinance.api.dto.request.TelegramCompleteRequest;
import uz.familyfinance.api.dto.request.TelegramVerifyPinRequest;
import uz.familyfinance.api.entity.TelegramAuthRequest;
import uz.familyfinance.api.enums.TelegramAuthStatus;
import uz.familyfinance.api.exception.BadRequestException;
import uz.familyfinance.api.repository.TelegramAuthRequestRepository;
import uz.familyfinance.api.service.TelegramAuthService;
import uz.familyfinance.api.service.telegram.TelegramBotClient;
import uz.familyfinance.api.service.telegram.TelegramUserInfo;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/**
 * Telegram tasdiq so'rovi muddati — real PostgreSQL 16 ustida (Testcontainers).
 *
 * <p>Unit testlar ({@code TelegramAuthExpiryTest}) mock repository bilan qaror mantig'ini
 * qulflaydi. Bu test esa aynan mock qoplay OLMAYDIGAN uchta narsani tekshiradi:</p>
 * <ol>
 *   <li><b>Sxema ↔ entity muvofiqligi:</b> {@code telegram_auth_requests.expires_at} ustuni
 *       Flyway migratsiyasi (V49) bilan mos, uzaytirilgan muddat DB'ga yozilyapti;</li>
 *   <li><b>Tranzaksion yozuv:</b> {@code status()} muddati o'tgan so'rovni EXPIRED qilib
 *       <i>saqlaydi</i> — keyingi tranzaksiyada ham EXPIRED (mock'da bu ko'rinmaydi);</li>
 *   <li><b>Real DELETE query:</b> cleanup'ning {@code @Modifying} JPQL'i PostgreSQL'da
 *       bajariladi va FAQAT eskirgan yozuvlarni o'chiradi (JPQL yaroqliligi + shart).</li>
 * </ol>
 *
 * <p>Klass darajasida {@code @Transactional} ATAYLAB YO'Q: har service chaqiruvi o'z
 * tranzaksiyasida commit bo'lishi kerak, aks holda "saqlandi" tekshiruvi bir tranzaksiya
 * ichidagi identity-map tufayli yolg'on-pozitiv bo'lardi. Yaratilgan yozuvlar
 * {@link #cleanupCreatedRows()} da o'chiriladi.</p>
 *
 * <p>{@link TelegramBotClient} mock: {@code confirm()} tasdiq xabarini yuboradi va klient
 * {@code enabled} bayrog'ini tekshirmasdan HTTP urinadi — mock'siz test tarmoqqa chiqib
 * (bo'sh token bilan) sekinlashardi.</p>
 */
@SpringBootTest
@ActiveProfiles("test")
@DisplayName("Telegram auth: tasdiq so'rovi muddati (real PG)")
class TelegramAuthExpiryIntegrationTest extends AbstractPostgresIntegrationTest {

    /** Seed'da yo'q Telegram ID (bog'lanmagan akkaunt → NEEDS_REGISTRATION shoxi). */
    private static final long UNKNOWN_TELEGRAM_ID = 990_000_101L;
    private static final String IP = "127.0.0.1";
    private static final String UA = "JUnit-integration-test";

    @Autowired
    private TelegramAuthService service;
    @Autowired
    private TelegramAuthRequestRepository requestRepository;

    @MockitoBean
    private TelegramBotClient botClient;

    /** Test yaratgan yozuvlar (klass @Transactional yo'q → qo'lda tozalanadi). */
    private final List<String> createdRequestIds = new ArrayList<>();

    /**
     * Bot "yoqilgan" deb ko'rsatiladi: {@code init()} bot o'chiq muhitda so'rov yaratishni
     * rad etadi (aks holda deep-link boshqa muhitdagi bot tomonidan "Havola yaroqsiz" deb
     * qaytariladi). Mock default'i {@code false} — bu testning mavzusi muddat mantig'i
     * bo'lgani uchun bot holatini aniq yoqib qo'yamiz.
     */
    @BeforeEach
    void enableBot() {
        when(botClient.isEnabled()).thenReturn(true);
    }

    @AfterEach
    void cleanupCreatedRows() {
        createdRequestIds.forEach(id ->
                requestRepository.findByRequestId(id).ifPresent(requestRepository::delete));
        createdRequestIds.clear();
    }

    private String newRequest() {
        String id = service.init();
        createdRequestIds.add(id);
        return id;
    }

    private TelegramAuthRequest reload(String requestId) {
        return requestRepository.findByRequestId(requestId).orElseThrow();
    }

    /** So'rovni DB darajasida "eskirgan" qiladi (vaqt kutmasdan). */
    private void forceExpiry(String requestId, LocalDateTime expiresAt) {
        TelegramAuthRequest req = reload(requestId);
        req.setExpiresAt(expiresAt);
        requestRepository.save(req);
    }

    private TelegramVerifyPinRequest pinRequest(String requestId, String pin) {
        TelegramVerifyPinRequest req = new TelegramVerifyPinRequest();
        req.setRequestId(requestId);
        req.setPin(pin);
        return req;
    }

    private TelegramUserInfo telegramUser(long telegramId) {
        return new TelegramUserInfo(telegramId, "Ali", "Valiyev", "ali_test", 4242L);
    }

    @Test
    @DisplayName("init(): PENDING so'rov real jadvalga muddati bilan yoziladi")
    void initPersistsPendingRequestWithExpiry() {
        String requestId = newRequest();

        TelegramAuthRequest saved = reload(requestId);
        assertThat(saved.getStatus()).isEqualTo(TelegramAuthStatus.PENDING);
        assertThat(saved.getExpiresAt())
                .isAfter(LocalDateTime.now())
                .isBefore(LocalDateTime.now().plusMinutes(6));
        assertThat(saved.getTelegramId()).isNull();
    }

    @Test
    @DisplayName("confirm(): CONFIRMED + uzaytirilgan muddat DB'ga saqlanadi")
    void confirmPersistsExtendedWindow() {
        String requestId = newRequest();
        // Deep-link'ni oxirgi soniyalarda bosgan holat
        forceExpiry(requestId, LocalDateTime.now().plusSeconds(3));

        service.confirm(requestId, telegramUser(UNKNOWN_TELEGRAM_ID));

        TelegramAuthRequest saved = reload(requestId);
        assertThat(saved.getStatus()).isEqualTo(TelegramAuthStatus.CONFIRMED);
        assertThat(saved.getTelegramId()).isEqualTo(UNKNOWN_TELEGRAM_ID);
        assertThat(saved.getConfirmedAt()).isNotNull();
        // PIN terish uchun real oyna DB'da ham qoldi (3 sekund emas)
        assertThat(saved.getExpiresAt()).isAfter(LocalDateTime.now().plusMinutes(9));
    }

    @Test
    @DisplayName("status(): bog'lanmagan Telegram akkaunt -> NEEDS_REGISTRATION")
    void statusNeedsRegistrationForUnlinkedAccount() {
        String requestId = newRequest();
        service.confirm(requestId, telegramUser(UNKNOWN_TELEGRAM_ID));

        var res = service.status(requestId, IP, UA);

        assertThat(res.getStatus()).isEqualTo("NEEDS_REGISTRATION");
        assertThat(res.getFirstName()).isEqualTo("Ali");
    }

    @Test
    @DisplayName("status(): muddati o'tgan CONFIRMED so'rov EXPIRED qilib SAQLANADI")
    void statusPersistsExpiredStatus() {
        String requestId = newRequest();
        service.confirm(requestId, telegramUser(UNKNOWN_TELEGRAM_ID));
        forceExpiry(requestId, LocalDateTime.now().minusMinutes(1));

        assertThat(service.status(requestId, IP, UA).getStatus()).isEqualTo("EXPIRED");

        // Alohida tranzaksiyada o'qilganda ham EXPIRED — ya'ni haqiqatan commit bo'lgan
        assertThat(reload(requestId).getStatus()).isEqualTo(TelegramAuthStatus.EXPIRED);
    }

    @Test
    @DisplayName("muddati o'tgan CONFIRMED so'rov: verifyPin va complete rad etiladi")
    void expiredRequestRejectsFinalizingFlows() {
        String verifyId = newRequest();
        service.confirm(verifyId, telegramUser(UNKNOWN_TELEGRAM_ID));
        forceExpiry(verifyId, LocalDateTime.now().minusMinutes(1));

        assertThatThrownBy(() -> service.verifyPin(pinRequest(verifyId, "1234"), IP, UA))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("muddati tugagan");

        String completeId = newRequest();
        service.confirm(completeId, telegramUser(UNKNOWN_TELEGRAM_ID));
        forceExpiry(completeId, LocalDateTime.now().minusMinutes(1));

        TelegramCompleteRequest complete = new TelegramCompleteRequest();
        complete.setRequestId(completeId);
        complete.setFirstName("Ali");
        complete.setPin("1234");

        assertThatThrownBy(() -> service.complete(complete, IP, UA))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("muddati tugagan");

        // Yozuvlar CONFIRMED qoladi: yakunlovchi oqim exception tashlaydi → tranzaksiya
        // rollback → status o'zgarishi saqlanmaydi. Guard VAQTGA asoslangan, shuning uchun
        // bu xavfsizlikni kamaytirmaydi — takror urinish ham xuddi shunday rad etiladi.
        assertThat(reload(verifyId).getStatus()).isEqualTo(TelegramAuthStatus.CONFIRMED);
        assertThatThrownBy(() -> service.verifyPin(pinRequest(verifyId, "1234"), IP, UA))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("muddati tugagan");

        // status() esa normal qaytadi → EXPIRED holati commit bo'ladi (terminal)
        assertThat(service.status(verifyId, IP, UA).getStatus()).isEqualTo("EXPIRED");
        assertThat(reload(verifyId).getStatus()).isEqualTo(TelegramAuthStatus.EXPIRED);
    }

    @Test
    @DisplayName("cleanup: real DELETE faqat eskirgan yozuvlarni o'chiradi (yangisi qoladi)")
    void cleanupDeletesOnlyExpiredRows() {
        String oldId = newRequest();
        // Ehtiyot oynasidan (1 soat) oldinga — cleanup shartiga tushadi
        forceExpiry(oldId, LocalDateTime.now().minusHours(2));
        String freshId = newRequest();

        service.cleanupExpiredRequests();

        assertThat(requestRepository.findByRequestId(oldId)).isEmpty();
        assertThat(requestRepository.findByRequestId(freshId)).isPresent();
    }

    @Test
    @DisplayName("cleanup: ehtiyot oynasidagi (yaqinda eskirgan) yozuv o'chirilmaydi")
    void cleanupKeepsRecentlyExpiredRow() {
        String recentlyExpired = newRequest();
        // Muddati o'tgan, lekin 1 soatlik ehtiyot oynasi ichida — oqim o'rtasi kesilmasin
        forceExpiry(recentlyExpired, LocalDateTime.now().minusMinutes(5));

        service.cleanupExpiredRequests();

        assertThat(requestRepository.findByRequestId(recentlyExpired)).isPresent();
    }
}
