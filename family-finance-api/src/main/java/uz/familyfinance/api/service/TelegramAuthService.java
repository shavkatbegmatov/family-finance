package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import uz.familyfinance.api.dto.request.SetPinRequest;
import uz.familyfinance.api.dto.request.TelegramCompleteRequest;
import uz.familyfinance.api.dto.request.TelegramVerifyPinRequest;
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
import java.time.Duration;
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
    private final PasswordEncoder passwordEncoder;

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int REQUEST_TTL_MINUTES = 5;
    private static final int MAX_PIN_ATTEMPTS = 5;
    private static final int PIN_LOCK_MINUTES = 15;

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
                if (user == null) {
                    return TelegramStatusResponse.needsRegistration(req.getFirstName(), req.getLastName());
                }
                if (user.getTelegramPinHash() == null) {
                    // Eski (PIN'siz, Blok B) Telegram user — birinchi kirishda PIN o'rnatish MAJBURIY
                    // (avval to'g'ridan-to'g'ri login qilinardi — bu xavfsizlik teshigi edi).
                    return TelegramStatusResponse.needsPinSetup();
                }
                // 2-faktor: PIN so'raladi. req CONFIRMED qoladi — verifyPin yakunlaydi.
                return TelegramStatusResponse.needsPin();
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

    /** PIN tekshirish (2-faktor): tasdiqdan keyin to'g'ri PIN → JWT. Lockout User'da saqlanadi. */
    @Transactional
    public JwtResponse verifyPin(TelegramVerifyPinRequest request, String ip, String ua) {
        TelegramAuthRequest req = requestRepository.findByRequestId(request.getRequestId())
                .orElseThrow(() -> new ResourceNotFoundException("So'rov topilmadi yoki eskirgan"));
        if (req.getStatus() != TelegramAuthStatus.CONFIRMED) {
            throw new BadRequestException("So'rov tasdiqlanmagan yoki allaqachon yakunlangan");
        }
        User user = userRepository.findByTelegramId(req.getTelegramId())
                .orElseThrow(() -> new ResourceNotFoundException("Foydalanuvchi topilmadi"));

        // Lockout — User'da (begona yangi init bilan aylanib o'ta olmaydi)
        if (user.getTelegramPinLockedUntil() != null
                && user.getTelegramPinLockedUntil().isAfter(LocalDateTime.now())) {
            long minutes = Duration.between(LocalDateTime.now(), user.getTelegramPinLockedUntil()).toMinutes() + 1;
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "PIN vaqtincha qulflangan. " + minutes + " daqiqadan so'ng urinib ko'ring.");
        }

        if (user.getTelegramPinHash() == null
                || !passwordEncoder.matches(request.getPin(), user.getTelegramPinHash())) {
            int attempts = (user.getTelegramPinAttempts() == null ? 0 : user.getTelegramPinAttempts()) + 1;
            if (attempts >= MAX_PIN_ATTEMPTS) {
                user.setTelegramPinAttempts(0);
                user.setTelegramPinLockedUntil(LocalDateTime.now().plusMinutes(PIN_LOCK_MINUTES));
                userRepository.save(user);
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                        "Juda ko'p noto'g'ri urinish. PIN " + PIN_LOCK_MINUTES + " daqiqaga qulflandi.");
            }
            user.setTelegramPinAttempts(attempts);
            userRepository.save(user);
            throw new BadRequestException("PIN noto'g'ri. Qolgan urinish: " + (MAX_PIN_ATTEMPTS - attempts));
        }

        // To'g'ri PIN — hisoblagich tozalanadi, login
        user.setTelegramPinAttempts(0);
        user.setTelegramPinLockedUntil(null);
        req.setStatus(TelegramAuthStatus.COMPLETED);
        User loaded = userRepository.findByIdWithRolesAndPermissions(user.getId()).orElse(user);
        return authService.buildJwtResponseForUser(loaded, ip, ua);
    }

    /** Eski (PIN'siz) Telegram user birinchi kirishda PIN o'rnatadi → JWT. */
    @Transactional
    public JwtResponse setupPin(TelegramVerifyPinRequest request, String ip, String ua) {
        TelegramAuthRequest req = requestRepository.findByRequestId(request.getRequestId())
                .orElseThrow(() -> new ResourceNotFoundException("So'rov topilmadi yoki eskirgan"));
        if (req.getStatus() != TelegramAuthStatus.CONFIRMED) {
            throw new BadRequestException("So'rov tasdiqlanmagan yoki allaqachon yakunlangan");
        }
        User user = userRepository.findByTelegramId(req.getTelegramId())
                .orElseThrow(() -> new ResourceNotFoundException("Foydalanuvchi topilmadi"));
        if (user.getTelegramPinHash() != null) {
            // PIN allaqachon bor — bu yo'l faqat eski (PIN'siz) userlar uchun; verifyPin ishlatilsin
            throw new BadRequestException("PIN allaqachon o'rnatilgan");
        }
        user.setTelegramPinHash(passwordEncoder.encode(request.getPin()));
        user.setTelegramPinAttempts(0);
        user.setTelegramPinLockedUntil(null);
        req.setStatus(TelegramAuthStatus.COMPLETED);
        User loaded = userRepository.findByIdWithRolesAndPermissions(user.getId()).orElse(user);
        return authService.buildJwtResponseForUser(loaded, ip, ua);
    }

    /**
     * Autentifikatsiyalangan user PIN o'rnatadi/o'zgartiradi — PIN unutilgach username+parol
     * bilan kirib qayta o'rnatish oqimi uchun.
     */
    @Transactional
    public void setPin(Long userId, SetPinRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Foydalanuvchi topilmadi"));
        user.setTelegramPinHash(passwordEncoder.encode(request.getPin()));
        user.setTelegramPinAttempts(0);
        user.setTelegramPinLockedUntil(null);
        log.info("Telegram PIN set/updated for user {}", user.getUsername());
    }

    private String generateRequestId() {
        byte[] bytes = new byte[24];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
