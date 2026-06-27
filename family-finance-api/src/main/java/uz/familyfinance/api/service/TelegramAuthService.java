package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.dto.request.TelegramCompleteRequest;
import uz.familyfinance.api.dto.response.JwtResponse;
import uz.familyfinance.api.dto.response.TelegramStatusResponse;
import uz.familyfinance.api.entity.TelegramAuthRequest;
import uz.familyfinance.api.entity.User;
import uz.familyfinance.api.enums.TelegramAuthStatus;
import uz.familyfinance.api.exception.BadRequestException;
import uz.familyfinance.api.exception.ResourceNotFoundException;
import uz.familyfinance.api.repository.TelegramAuthRequestRepository;
import uz.familyfinance.api.repository.UserRepository;
import uz.familyfinance.api.service.telegram.TelegramBotClient;
import uz.familyfinance.api.service.telegram.TelegramUserInfo;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;

/**
 * Telegram deep-link autentifikatsiya oqimi: init → (bot /start → confirm) → status → complete.
 * Token/session yaratish va scope provisioning {@link AuthService}'ga delegatsiya qilinadi (DRY).
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class TelegramAuthService {

    private final TelegramAuthRequestRepository requestRepository;
    private final UserRepository userRepository;
    private final AuthService authService;
    private final TelegramBotClient botClient;

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int REQUEST_TTL_MINUTES = 5;

    /** Frontend "Telegram orqali kirish" bosganda — yangi PENDING so'rov, requestId qaytaradi. */
    @Transactional
    public String init() {
        String requestId = generateRequestId();
        requestRepository.save(TelegramAuthRequest.builder()
                .requestId(requestId)
                .status(TelegramAuthStatus.PENDING)
                .expiresAt(LocalDateTime.now().plusMinutes(REQUEST_TTL_MINUTES))
                .build());
        return requestId;
    }

    /** Polling'dan: bot {@code /start <requestId>} oldi — Telegram ma'lumotlarini biriktiradi. */
    @Transactional
    public void confirm(String requestId, TelegramUserInfo info) {
        TelegramAuthRequest req = requestRepository.findByRequestId(requestId).orElse(null);
        if (req == null) {
            botClient.sendMessage(info.chatId(), "❌ Havola yaroqsiz. Ilovada qaytadan urinib ko'ring.");
            return;
        }
        if (req.getStatus() != TelegramAuthStatus.PENDING || req.getExpiresAt().isBefore(LocalDateTime.now())) {
            botClient.sendMessage(info.chatId(), "⏳ Bu havola eskirgan. Ilovada qaytadan urinib ko'ring.");
            return;
        }
        req.setTelegramId(info.telegramId());
        req.setFirstName(info.firstName());
        req.setLastName(info.lastName());
        req.setTelegramUsername(info.username());
        req.setStatus(TelegramAuthStatus.CONFIRMED);
        req.setConfirmedAt(LocalDateTime.now());
        botClient.sendMessage(info.chatId(), "✅ Tasdiqlandi! Ilovaga qayting — kirish avtomatik davom etadi.");
        log.info("Telegram auth confirmed: requestId={}, telegramId={}", requestId, info.telegramId());
    }

    /** Frontend poll'i: PENDING / AUTHENTICATED (mavjud user) / NEEDS_REGISTRATION (yangi) / EXPIRED. */
    @Transactional
    public TelegramStatusResponse status(String requestId, String ip, String ua) {
        TelegramAuthRequest req = requestRepository.findByRequestId(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("So'rov topilmadi yoki eskirgan"));

        switch (req.getStatus()) {
            case PENDING -> {
                if (req.getExpiresAt().isBefore(LocalDateTime.now())) {
                    req.setStatus(TelegramAuthStatus.EXPIRED);
                    return TelegramStatusResponse.expired();
                }
                return TelegramStatusResponse.pending();
            }
            case CONFIRMED -> {
                User user = userRepository.findByTelegramId(req.getTelegramId()).orElse(null);
                if (user != null) {
                    req.setStatus(TelegramAuthStatus.COMPLETED);
                    User loaded = userRepository.findByIdWithRolesAndPermissions(user.getId()).orElse(user);
                    return TelegramStatusResponse.authenticated(authService.buildJwtResponseForUser(loaded, ip, ua));
                }
                return TelegramStatusResponse.needsRegistration(req.getFirstName(), req.getLastName());
            }
            default -> {
                return TelegramStatusResponse.expired();
            }
        }
    }

    /** Yangi Telegram user uchun ro'yxatdan o'tishni yakunlash (jins majburiy) → JWT. */
    @Transactional
    public JwtResponse complete(TelegramCompleteRequest request, String ip, String ua) {
        TelegramAuthRequest req = requestRepository.findByRequestId(request.getRequestId())
                .orElseThrow(() -> new ResourceNotFoundException("So'rov topilmadi yoki eskirgan"));
        if (req.getStatus() != TelegramAuthStatus.CONFIRMED) {
            throw new BadRequestException("So'rov tasdiqlanmagan yoki allaqachon yakunlangan");
        }
        if (userRepository.findByTelegramId(req.getTelegramId()).isPresent()) {
            throw new BadRequestException("Bu Telegram akkaunt allaqachon ro'yxatdan o'tgan");
        }

        User user = authService.createTelegramUser(req, request);
        req.setStatus(TelegramAuthStatus.COMPLETED);

        User loaded = userRepository.findByIdWithRolesAndPermissions(user.getId()).orElse(user);
        return authService.buildJwtResponseForUser(loaded, ip, ua);
    }

    private String generateRequestId() {
        byte[] bytes = new byte[24];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
