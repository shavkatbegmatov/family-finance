package uz.familyfinance.api.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;
import uz.familyfinance.api.entity.TelegramAuthRequest;
import uz.familyfinance.api.exception.BadRequestException;
import uz.familyfinance.api.repository.TelegramAuthRequestRepository;
import uz.familyfinance.api.repository.UserRepository;
import uz.familyfinance.api.service.telegram.TelegramBotClient;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Telegram bot o'chiq muhitda auth oqimi boshlanmaydi.
 *
 * <p><b>Nima uchun bu test bor:</b> {@code init()} bot holatini tekshirmasdan PENDING
 * so'rov yaratardi. Oqim keyin jimgina buzilardi: front deep-link ochadi, foydalanuvchi
 * botda {@code /start} bosadi, lekin uni <b>boshqa muhitdagi</b> bot qabul qiladi
 * (polling faqat prod'da yoqilgan) va requestId o'z bazasida topilmagani uchun
 * "❌ Havola yaroqsiz" javobini beradi. Ilovada esa spinner cheksiz aylanaveradi —
 * foydalanuvchi sababni bilmaydi.</p>
 *
 * <p>Bu ayniqsa lokal dev'da uchraydi: requestId lokal bazada yaratiladi, prod bot esa
 * prod bazada qidiradi. Xuddi shu nomutanosiblik staging ↔ prod orasida ham bo'ladi.</p>
 *
 * <p>Toza mock'lar (Spring/DB kerak emas) → gating surefire'da ishlaydi.</p>
 */
@DisplayName("TelegramAuthService.init — bot o'chiq muhit")
class TelegramAuthDisabledTest {

    private TelegramAuthRequestRepository requestRepository;
    private TelegramBotClient botClient;
    private TelegramAuthService service;

    @BeforeEach
    void setUp() {
        requestRepository = mock(TelegramAuthRequestRepository.class);
        botClient = mock(TelegramBotClient.class);

        service = new TelegramAuthService(
                requestRepository,
                mock(UserRepository.class),
                mock(AuthService.class),
                botClient,
                mock(PasswordEncoder.class));
    }

    @Test
    @DisplayName("Bot o'chiq bo'lsa 400 va so'rov UMUMAN yaratilmaydi")
    void disabledBotRejectsInit() {
        when(botClient.isEnabled()).thenReturn(false);

        assertThatThrownBy(() -> service.init())
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("yoqilmagan");

        // Muhim: yetim PENDING yozuv qolmasligi kerak
        verify(requestRepository, never()).save(any());
    }

    @Test
    @DisplayName("Bot yoqilgan bo'lsa oqim odatdagidek boshlanadi")
    void enabledBotCreatesRequest() {
        when(botClient.isEnabled()).thenReturn(true);
        when(requestRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        String requestId = service.init();

        assertThat(requestId).isNotBlank();
        verify(requestRepository).save(any(TelegramAuthRequest.class));
    }
}
