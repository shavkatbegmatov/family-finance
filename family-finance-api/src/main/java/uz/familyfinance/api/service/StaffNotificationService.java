package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.dto.response.StaffNotificationResponse;
import uz.familyfinance.api.entity.StaffNotification;
import uz.familyfinance.api.entity.User;
import uz.familyfinance.api.enums.StaffNotificationType;
import uz.familyfinance.api.exception.ResourceNotFoundException;
import uz.familyfinance.api.repository.StaffNotificationRepository;
import uz.familyfinance.api.repository.UserRepository;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class StaffNotificationService {

    private final StaffNotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final NotificationDispatcher notificationDispatcher;

    /**
     * Foydalanuvchi uchun bildirishnomalarni olish
     */
    @Transactional(readOnly = true)
    public Page<StaffNotificationResponse> getNotifications(Long userId, Pageable pageable) {
        return notificationRepository.findByUserIdOrGlobal(userId, pageable)
                .map(StaffNotificationResponse::from);
    }

    /**
     * Tur bo'yicha filtrlangan bildirishnomalar
     */
    @Transactional(readOnly = true)
    public Page<StaffNotificationResponse> getNotificationsByType(
            Long userId, StaffNotificationType type, Pageable pageable) {
        return notificationRepository.findByUserIdOrGlobalAndType(userId, type, pageable)
                .map(StaffNotificationResponse::from);
    }

    /**
     * O'qilmagan bildirishnomalar soni
     */
    @Transactional(readOnly = true)
    public long getUnreadCount(Long userId) {
        return notificationRepository.countUnreadByUserId(userId);
    }

    /**
     * O'qilmagan bildirishnomalar ro'yxati (dropdown uchun)
     */
    @Transactional(readOnly = true)
    public List<StaffNotificationResponse> getUnreadNotifications(Long userId) {
        return notificationRepository.findUnreadByUserId(userId).stream()
                .map(StaffNotificationResponse::from)
                .collect(Collectors.toList());
    }

    /**
     * Bildirishnomani o'qilgan qilish
     */
    @Transactional
    public void markAsRead(Long notificationId) {
        int updated = notificationRepository.markAsReadById(notificationId);
        if (updated == 0) {
            throw new ResourceNotFoundException("Bildirishnoma topilmadi yoki allaqachon o'qilgan");
        }
    }

    /**
     * Barchasini o'qilgan qilish
     */
    @Transactional
    public int markAllAsRead(Long userId) {
        return notificationRepository.markAllAsReadByUserId(userId);
    }

    /**
     * Bildirishnomani o'chirish
     */
    @Transactional
    public void deleteNotification(Long notificationId) {
        if (!notificationRepository.existsById(notificationId)) {
            throw new ResourceNotFoundException("Bildirishnoma topilmadi");
        }
        notificationRepository.deleteById(notificationId);
    }

    /**
     * Yangi bildirishnoma yaratish (barcha xodimlar uchun)
     */
    @Transactional
    public StaffNotification createGlobalNotification(
            String title,
            String message,
            StaffNotificationType type,
            String referenceType,
            Long referenceId) {

        StaffNotification notification = StaffNotification.builder()
                .user(null) // global
                .title(title)
                .message(message)
                .notificationType(type)
                .referenceType(referenceType)
                .referenceId(referenceId)
                .isRead(false)
                .build();

        StaffNotification saved = notificationRepository.save(notification);

        // WebSocket orqali real-time yuborish
        notificationDispatcher.notifyAllStaff(saved);

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

    // ===== Yordamchi metodlar (boshqa service'lardan chaqirish uchun) =====

    public void notifyBudgetWarning(String categoryName, double percentage, Long budgetId) {
        createGlobalNotification(
                "Byudjet ogohlantirishi",
                String.format("%s kategoriyasi byudjeti %.0f%% sarflandi", categoryName, percentage),
                StaffNotificationType.BUDGET_WARNING,
                "BUDGET",
                budgetId
        );
    }

    public void notifyBudgetExceeded(String categoryName, double percentage, Long budgetId) {
        createGlobalNotification(
                "Byudjet oshib ketdi!",
                String.format("%s kategoriyasi byudjeti %.0f%% sarflandi!", categoryName, percentage),
                StaffNotificationType.BUDGET_EXCEEDED,
                "BUDGET",
                budgetId
        );
    }

    public void notifyDebtReminder(String personName, String amount, int daysLeft, Long debtId) {
        createGlobalNotification(
                "Qarz eslatmasi",
                String.format("%s ning qarzi %s so'm. Muddat: %d kun qoldi", personName, amount, daysLeft),
                StaffNotificationType.DEBT_REMINDER,
                "DEBT",
                debtId
        );
    }

    public void notifySavingsMilestone(String goalName, Long goalId) {
        createGlobalNotification(
                "Jamg'arma maqsadi bajarildi!",
                String.format("\"%s\" maqsadi to'liq bajarildi!", goalName),
                StaffNotificationType.SAVINGS_MILESTONE,
                "SAVINGS_GOAL",
                goalId
        );
    }
}
