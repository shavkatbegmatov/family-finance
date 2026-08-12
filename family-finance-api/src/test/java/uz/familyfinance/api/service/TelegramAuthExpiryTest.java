package uz.familyfinance.api.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;
import uz.familyfinance.api.dto.request.TelegramCompleteRequest;
import uz.familyfinance.api.dto.request.TelegramVerifyPinRequest;
import uz.familyfinance.api.dto.response.JwtResponse;
import uz.familyfinance.api.entity.TelegramAuthRequest;
import uz.familyfinance.api.entity.User;
import uz.familyfinance.api.enums.TelegramAuthStatus;
import uz.familyfinance.api.exception.BadRequestException;
import uz.familyfinance.api.repository.TelegramAuthRequestRepository;
import uz.familyfinance.api.repository.UserRepository;
import uz.familyfinance.api.service.telegram.TelegramBotClient;
import uz.familyfinance.api.service.telegram.TelegramUserInfo;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Telegram tasdiq so'rovi muddati (xavfsizlik regressiya qulfi).
 *
 * <p>Avval {@code expiresAt} FAQAT PENDING shoxida tekshirilardi: bir marta CONFIRMED
 * bo'lgan so'rov abadiy yashardi. Sizib ketgan {@code requestId} (log, skrinshot, chat)
 * bilan cheksiz vaqt PIN bruteforce qilish — yoki bog'lanmagan Telegram akkaunt uchun
 * begona nomiga ro'yxatdan o'tish — mumkin edi. Bu test har bir yakunlovchi oqim muddatni
 * tekshirishini va {@code confirm} PIN kiritish uchun oyna berishini qulflaydi.</p>
 *
 * <p>Toza mock'lar (Spring/DB kerak emas) → gating surefire'da ishlaydi.</p>
 */
@DisplayName("TelegramAuthService — tasdiq so'rovi muddati (xavfsizlik)")
class TelegramAuthExpiryTest {

    private static final String RID = "test-request-id";
    private static final long TELEGRAM_ID = 777L;

    private TelegramAuthRequestRepository requestRepository;
    private UserRepository userRepository;
    private AuthService authService;
    private TelegramBotClient botClient;
    private PasswordEncoder passwordEncoder;
    private TelegramAuthService service;

    @BeforeEach
    void setUp() {
        requestRepository = mock(TelegramAuthRequestRepository.class);
        userRepository = mock(UserRepository.class);
        authService = mock(AuthService.class);
        botClient = mock(TelegramBotClient.class);
        passwordEncoder = mock(PasswordEncoder.class);
        service = new TelegramAuthService(requestRepository, userRepository, authService,
                botClient, passwordEncoder);
    }

    /** Tasdiqlangan, lekin muddati o'tgan so'rov. */
    private TelegramAuthRequest expiredConfirmed() {
        TelegramAuthRequest req = TelegramAuthRequest.builder()
                .requestId(RID)
                .status(TelegramAuthStatus.CONFIRMED)
                .telegramId(TELEGRAM_ID)
                .confirmedAt(LocalDateTime.now().minusHours(3))
                .expiresAt(LocalDateTime.now().minusHours(2))
                .build();
        when(requestRepository.findByRequestId(RID)).thenReturn(Optional.of(req));
        return req;
    }

    /** Tasdiqlangan va muddati o'tmagan so'rov (normal oqim). */
    private TelegramAuthRequest freshConfirmed() {
        TelegramAuthRequest req = TelegramAuthRequest.builder()
                .requestId(RID)
                .status(TelegramAuthStatus.CONFIRMED)
                .telegramId(TELEGRAM_ID)
                .confirmedAt(LocalDateTime.now())
                .expiresAt(LocalDateTime.now().plusMinutes(9))
                .build();
        when(requestRepository.findByRequestId(RID)).thenReturn(Optional.of(req));
        return req;
    }

    private TelegramVerifyPinRequest pinRequest(String pin) {
        TelegramVerifyPinRequest req = new TelegramVerifyPinRequest();
        req.setRequestId(RID);
        req.setPin(pin);
        return req;
    }

    @Nested
    @DisplayName("muddati o'tgan CONFIRMED so'rov rad etiladi")
    class ExpiredRejected {

        @Test
        @DisplayName("status() -> EXPIRED va yozuv EXPIRED holatiga o'tadi")
        void statusReturnsExpired() {
            TelegramAuthRequest req = expiredConfirmed();

            var res = service.status(RID, "1.2.3.4", "UA");

            assertThat(res.getStatus()).isEqualTo("EXPIRED");
            assertThat(req.getStatus()).isEqualTo(TelegramAuthStatus.EXPIRED);
            // Muddati o'tgan so'rovda user qidirilmasligi ham kerak (PIN shoxiga tushmaydi)
            verify(userRepository, never()).findByTelegramId(any());
        }

        @Test
        @DisplayName("verifyPin() -> xato, PIN umuman taqqoslanmaydi")
        void verifyPinRejected() {
            expiredConfirmed();

            assertThatThrownBy(() -> service.verifyPin(pinRequest("1234"), "ip", "ua"))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("muddati tugagan");

            verify(passwordEncoder, never()).matches(any(), any());
            verify(authService, never()).buildJwtResponseForUser(any(), anyString(), anyString());
        }

        @Test
        @DisplayName("complete() -> xato, yangi user yaratilmaydi")
        void completeRejected() {
            expiredConfirmed();
            TelegramCompleteRequest request = new TelegramCompleteRequest();
            request.setRequestId(RID);

            assertThatThrownBy(() -> service.complete(request, "ip", "ua"))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("muddati tugagan");

            verify(authService, never()).createTelegramUser(any(), any());
        }

        @Test
        @DisplayName("setupPin() -> xato, PIN o'rnatilmaydi")
        void setupPinRejected() {
            expiredConfirmed();

            assertThatThrownBy(() -> service.setupPin(pinRequest("4321"), "ip", "ua"))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("muddati tugagan");

            verify(passwordEncoder, never()).encode(any());
        }

        @Test
        @DisplayName("takror urinishlar ham rad etiladi (guard vaqtga asoslangan, holatga emas)")
        void repeatedAttemptsAlsoRejected() {
            TelegramAuthRequest req = expiredConfirmed();

            for (int i = 0; i < 3; i++) {
                assertThatThrownBy(() -> service.verifyPin(pinRequest("1234"), "ip", "ua"))
                        .isInstanceOf(BadRequestException.class)
                        .hasMessageContaining("muddati tugagan");
            }
            // Yozuv CONFIRMED qoladi — exception tranzaksiyani rollback qilgani uchun
            // yakunlovchi oqimda status'ni o'zgartirishga urinish ma'nosiz (integratsiya
            // testi buni ushlagan). Terminal EXPIRED'ni status() o'rnatadi.
            assertThat(req.getStatus()).isEqualTo(TelegramAuthStatus.CONFIRMED);
            verify(passwordEncoder, never()).matches(any(), any());
        }
    }

    @Nested
    @DisplayName("normal oqim buzilmaydi")
    class HappyPath {

        @Test
        @DisplayName("confirm() muddatni PIN kiritish uchun uzaytiradi (~10 daqiqa)")
        void confirmExtendsWindow() {
            // Deep-link'ni oxirgi soniyada bosgan holat: 2 sekund qolgan
            TelegramAuthRequest req = TelegramAuthRequest.builder()
                    .requestId(RID)
                    .status(TelegramAuthStatus.PENDING)
                    .expiresAt(LocalDateTime.now().plusSeconds(2))
                    .build();
            when(requestRepository.findByRequestId(RID)).thenReturn(Optional.of(req));

            service.confirm(RID, new TelegramUserInfo(TELEGRAM_ID, "Ali", "Valiyev", "ali", 42L));

            assertThat(req.getStatus()).isEqualTo(TelegramAuthStatus.CONFIRMED);
            // PIN terishga real oyna qoldi (aks holda 2 sekundda ulgurish kerak bo'lardi)
            assertThat(req.getExpiresAt()).isAfter(LocalDateTime.now().plusMinutes(9));
        }

        @Test
        @DisplayName("muddati o'tmagan CONFIRMED so'rovda to'g'ri PIN bilan login ishlaydi")
        void verifyPinStillWorks() {
            freshConfirmed();
            User user = User.builder()
                    .username("tg777")
                    .telegramId(TELEGRAM_ID)
                    .telegramPinHash("$2a$10$hash")
                    .telegramPinAttempts(0)
                    .build();
            user.setId(5L);
            when(userRepository.findByTelegramId(TELEGRAM_ID)).thenReturn(Optional.of(user));
            when(passwordEncoder.matches("1234", "$2a$10$hash")).thenReturn(true);
            when(userRepository.findByIdWithRolesAndPermissions(5L)).thenReturn(Optional.of(user));
            JwtResponse expected = mock(JwtResponse.class);
            when(authService.buildJwtResponseForUser(user, "ip", "ua")).thenReturn(expected);

            JwtResponse actual = service.verifyPin(pinRequest("1234"), "ip", "ua");

            assertThat(actual).isSameAs(expected);
        }

        @Test
        @DisplayName("status(): muddati o'tmagan CONFIRMED -> NEEDS_PIN")
        void statusNeedsPin() {
            freshConfirmed();
            User user = User.builder().telegramId(TELEGRAM_ID).telegramPinHash("$2a$10$hash").build();
            when(userRepository.findByTelegramId(TELEGRAM_ID)).thenReturn(Optional.of(user));

            assertThat(service.status(RID, "ip", "ua").getStatus()).isEqualTo("NEEDS_PIN");
        }
    }

    @Nested
    @DisplayName("cleanup")
    class Cleanup {

        @Test
        @DisplayName("eskirgan so'rovlarni o'chiradi (ehtiyot oynasi bilan)")
        void deletesExpired() {
            when(requestRepository.deleteExpiredBefore(any())).thenReturn(3);

            service.cleanupExpiredRequests();

            verify(requestRepository).deleteExpiredBefore(any(LocalDateTime.class));
        }
    }
}
