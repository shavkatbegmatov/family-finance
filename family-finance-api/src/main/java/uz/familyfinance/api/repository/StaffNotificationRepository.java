package uz.familyfinance.api.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import uz.familyfinance.api.entity.StaffNotification;
import uz.familyfinance.api.enums.StaffNotificationType;

import java.util.Collection;
import java.util.List;

@Repository
public interface StaffNotificationRepository extends JpaRepository<StaffNotification, Long> {

    // ------------------------------------------------------------------
    // Ko'rinish qoidasi (V61 — cross-tenant izolyatsiya):
    // Bildirishnoma foydalanuvchiga ko'rinadi, agar:
    //   • unga shaxsan yo'llangan bo'lsa (user.id = :userId), YOKI
    //   • u ko'ra oladigan scope'ga tegishli bo'lsa (scope.id IN :scopeIds), YOKI
    //   • u haqiqiy tizim-global bo'lsa (user IS NULL AND scope IS NULL).
    // :scopeIds bo'sh bo'lmasligi kerak — chaqiruvchi -1L sentinel qo'shadi.
    // ------------------------------------------------------------------

    @Query("SELECT n FROM StaffNotification n WHERE n.user.id = :userId "
         + "OR n.scope.id IN :scopeIds "
         + "OR (n.user IS NULL AND n.scope IS NULL) "
         + "ORDER BY n.createdAt DESC")
    Page<StaffNotification> findVisible(@Param("userId") Long userId,
                                        @Param("scopeIds") Collection<Long> scopeIds,
                                        Pageable pageable);

    @Query("SELECT n FROM StaffNotification n WHERE (n.user.id = :userId "
         + "OR n.scope.id IN :scopeIds "
         + "OR (n.user IS NULL AND n.scope IS NULL)) "
         + "AND n.notificationType = :type ORDER BY n.createdAt DESC")
    Page<StaffNotification> findVisibleByType(@Param("userId") Long userId,
                                              @Param("scopeIds") Collection<Long> scopeIds,
                                              @Param("type") StaffNotificationType type,
                                              Pageable pageable);

    @Query("SELECT COUNT(n) FROM StaffNotification n WHERE (n.user.id = :userId "
         + "OR n.scope.id IN :scopeIds "
         + "OR (n.user IS NULL AND n.scope IS NULL)) AND n.isRead = false")
    long countUnreadVisible(@Param("userId") Long userId,
                            @Param("scopeIds") Collection<Long> scopeIds);

    @Query("SELECT n FROM StaffNotification n WHERE (n.user.id = :userId "
         + "OR n.scope.id IN :scopeIds "
         + "OR (n.user IS NULL AND n.scope IS NULL)) AND n.isRead = false "
         + "ORDER BY n.createdAt DESC")
    List<StaffNotification> findUnreadVisible(@Param("userId") Long userId,
                                              @Param("scopeIds") Collection<Long> scopeIds);

    @Modifying
    @Query("UPDATE StaffNotification n SET n.isRead = true, n.readAt = CURRENT_TIMESTAMP "
         + "WHERE (n.user.id = :userId OR n.scope.id IN :scopeIds "
         + "OR (n.user IS NULL AND n.scope IS NULL)) AND n.isRead = false")
    int markAllVisibleAsRead(@Param("userId") Long userId,
                             @Param("scopeIds") Collection<Long> scopeIds);

    /**
     * Bitta bildirishnomani o'qilgan qilish — FAQAT foydalanuvchiga tegishli
     * (shaxsiy) yoki ko'radigan scope'idagi bo'lsa (IDOR himoyasi). Tizim-global
     * yozuvni oddiy foydalanuvchi umumiy holatda o'zgartira olmaydi.
     */
    @Modifying
    @Query("UPDATE StaffNotification n SET n.isRead = true, n.readAt = CURRENT_TIMESTAMP "
         + "WHERE n.id = :id AND n.isRead = false "
         + "AND (n.user.id = :userId OR n.scope.id IN :scopeIds)")
    int markAsReadByIdForUser(@Param("id") Long id,
                              @Param("userId") Long userId,
                              @Param("scopeIds") Collection<Long> scopeIds);

    /** O'chirish — mark bilan bir xil egalik/ko'rinish sharti (IDOR himoyasi). */
    @Modifying
    @Query("DELETE FROM StaffNotification n WHERE n.id = :id "
         + "AND (n.user.id = :userId OR n.scope.id IN :scopeIds)")
    int deleteByIdForUser(@Param("id") Long id,
                          @Param("userId") Long userId,
                          @Param("scopeIds") Collection<Long> scopeIds);

    /**
     * Eski bildirishnomalarni o'chirish (30 kundan eski)
     */
    @Modifying
    @Query("DELETE FROM StaffNotification n WHERE n.createdAt < CURRENT_TIMESTAMP - 30 DAY")
    int deleteOldNotifications();
}
