package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.dto.response.StaffNotificationResponse;
import uz.familyfinance.api.entity.Scope;
import uz.familyfinance.api.entity.StaffNotification;
import uz.familyfinance.api.entity.User;
import uz.familyfinance.api.enums.MembershipStatus;
import uz.familyfinance.api.enums.StaffNotificationType;
import uz.familyfinance.api.exception.ResourceNotFoundException;
import uz.familyfinance.api.repository.ScopeMembershipRepository;
import uz.familyfinance.api.repository.StaffNotificationRepository;
import uz.familyfinance.api.repository.UserRepository;

import java.util.Collection;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class StaffNotificationService {

    private final StaffNotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final NotificationDispatcher notificationDispatcher;
    private final ScopeContextService scopeContext;
    private final ScopeMembershipRepository membershipRepository;

    /**
     * Joriy foydalanuvchi ko'ra oladigan scope ID'lar (bo'sh IN'dan qochish uchun
     * -1L sentinel bilan) — bildirishnoma ko'rinishini scope bo'yicha chegaralaydi.
     */
    private Collection<Long> visibleScopeIds() {
        Set<Long> ids = scopeContext.getVisibleScopeIds();
        if (ids == null || ids.isEmpty()) {
            return List.of(-1L);
        }
        return ids;
    }

    /**
     * Foydalanuvchi uchun bildirishnomalarni olish (faqat ko'radigan scope'lar).
     */
    @Transactional(readOnly = true)
    public Page<StaffNotificationResponse> getNotifications(Long userId, Pageable pageable) {
        return notificationRepository.findVisible(userId, visibleScopeIds(), pageable)
                .map(StaffNotificationResponse::from);
    }

    /**
     * Tur bo'yicha filtrlangan bildirishnomalar (faqat ko'radigan scope'lar).
     */
    @Transactional(readOnly = true)
    public Page<StaffNotificationResponse> getNotificationsByType(
            Long userId, StaffNotificationType type, Pageable pageable) {
        return notificationRepository.findVisibleByType(userId, visibleScopeIds(), type, pageable)
                .map(StaffNotificationResponse::from);
    }

    /**
     * O'qilmagan bildirishnomalar soni (faqat ko'radigan scope'lar).
     */
    @Transactional(readOnly = true)
    public long getUnreadCount(Long userId) {
        return notificationRepository.countUnreadVisible(userId, visibleScopeIds());
    }

    /**
     * O'qilmagan bildirishnomalar ro'yxati (dropdown uchun, faqat ko'radigan scope'lar).
     */
    @Transactional(readOnly = true)
    public List<StaffNotificationResponse> getUnreadNotifications(Long userId) {
        return notificationRepository.findUnreadVisible(userId, visibleScopeIds()).stream()
                .map(StaffNotificationResponse::from)
                .collect(Collectors.toList());
    }

    /**
     * Bildirishnomani o'qilgan qilish — faqat foydalanuvchiga ko'rinadigan bo'lsa
     * (IDOR himoyasi).
     */
    @Transactional
    public void markAsRead(Long notificationId, Long userId) {
        int updated = notificationRepository.markAsReadByIdForUser(
                notificationId, userId, visibleScopeIds());
        if (updated == 0) {
            throw new ResourceNotFoundException("Bildirishnoma topilmadi yoki allaqachon o'qilgan");
        }
    }

    /**
     * Barchasini o'qilgan qilish (faqat ko'radigan bildirishnomalar).
     */
    @Transactional
    public int markAllAsRead(Long userId) {
        return notificationRepository.markAllVisibleAsRead(userId, visibleScopeIds());
    }

    /**
     * Bildirishnomani o'chirish — faqat foydalanuvchiga ko'rinadigan bo'lsa
     * (IDOR himoyasi).
     */
    @Transactional
    public void deleteNotification(Long notificationId, Long userId) {
        int deleted = notificationRepository.deleteByIdForUser(
                notificationId, userId, visibleScopeIds());
        if (deleted == 0) {
            throw new ResourceNotFoundException("Bildirishnoma topilmadi");
        }
    }

    /**
     * Yangi scoped bildirishnoma yaratish — FAQAT berilgan scope ACTIVE a'zolariga
     * ko'rinadi va yetkaziladi (cross-tenant PII sizishining oldini oladi — V61).
     *
     * <p>{@code scope == null} bo'lsa — haqiqiy tizim-global (barcha xodimlarga).
     * Uni faqat butun tizimga tegishli xabar uchun ishlating.</p>
     */
    @Transactional
    public StaffNotification createScopedNotification(
            Scope scope,
            String title,
            String message,
            StaffNotificationType type,
            String referenceType,
            Long referenceId) {

        StaffNotification notification = StaffNotification.builder()
                .user(null)
                .scope(scope)
                .title(title)
                .message(message)
                .notificationType(type)
                .referenceType(referenceType)
                .referenceId(referenceId)
                .isRead(false)
                .build();

        StaffNotification saved = notificationRepository.save(notification);

        // WebSocket orqali real-time yetkazish — scoped bo'lsa FAQAT o'sha scope
        // ACTIVE a'zolarining shaxsiy queue'siga (cross-scope broadcast YO'Q).
        if (scope != null) {
            membershipRepository.findByScopeIdAndStatus(scope.getId(), MembershipStatus.ACTIVE)
                    .forEach(m -> notificationDispatcher.notifyStaff(m.getUser().getId(), saved));
        } else {
            notificationDispatcher.notifyAllStaff(saved);
        }

        return saved;
    }

    /**
     * Yangi bildirishnoma yaratish (ma'lum foydalanuvchi uchun)
     */
    @Transactional
    public StaffNotification createNotificationForUser(
            Long userId,
            String title,
            String message,
            StaffNotificationType type,
            String referenceType,
            Long referenceId) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Foydalanuvchi topilmadi"));

        StaffNotification notification = StaffNotification.builder()
                .user(user)
                .title(title)
                .message(message)
                .notificationType(type)
                .referenceType(referenceType)
                .referenceId(referenceId)
                .isRead(false)
                .build();

        StaffNotification saved = notificationRepository.save(notification);

        // WebSocket orqali real-time yuborish (faqat shu foydalanuvchiga)
        notificationDispatcher.notifyStaff(userId, saved);

        return saved;
    }

    /**
     * Eski bildirishnomalarni tozalash
     */
    @Transactional
    public int cleanupOldNotifications() {
        int deleted = notificationRepository.deleteOldNotifications();
        log.info("Deleted {} old notifications", deleted);
        return deleted;
    }
}
