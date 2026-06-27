package uz.familyfinance.api.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import uz.familyfinance.api.entity.base.BaseEntity;
import uz.familyfinance.api.enums.TelegramAuthStatus;

import java.time.LocalDateTime;

/**
 * Telegram deep-link autentifikatsiya tasdiq so'rovi (qisqa muddatli, ~5 daqiqa).
 *
 * <p>Frontend {@code init} qilganda yaratiladi (status PENDING). Foydalanuvchi botda
 * {@code /start <requestId>} bosgach, {@code TelegramPollingService} uni topib Telegram
 * ma'lumotlari bilan to'ldiradi (status CONFIRMED). Frontend status'ni poll qiladi.</p>
 */
@Entity
@Table(name = "telegram_auth_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TelegramAuthRequest extends BaseEntity {

    @Column(name = "request_id", nullable = false, unique = true, length = 64)
    private String requestId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private TelegramAuthStatus status = TelegramAuthStatus.PENDING;

    @Column(name = "telegram_id")
    private Long telegramId;

    @Column(name = "telegram_username", length = 100)
    private String telegramUsername;

    @Column(name = "first_name", length = 100)
    private String firstName;

    @Column(name = "last_name", length = 100)
    private String lastName;

    @Column(name = "confirmed_at")
    private LocalDateTime confirmedAt;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;
}
