package uz.familyfinance.api.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import uz.familyfinance.api.entity.Debt;
import uz.familyfinance.api.enums.DebtStatus;
import uz.familyfinance.api.enums.StaffNotificationType;
import uz.familyfinance.api.repository.DebtRepository;
import uz.familyfinance.api.service.AuditLogService;
import uz.familyfinance.api.service.RecurringTransactionService;
import uz.familyfinance.api.service.StaffNotificationService;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class FinanceScheduler {

    private final DebtRepository debtRepository;
    private final StaffNotificationService notificationService;
    private final RecurringTransactionService recurringTransactionService;
    private final AuditLogService auditLogService;

    @Scheduled(cron = "0 0 9 * * *")
    public void checkOverdueDebts() {
        log.info("Starting overdue debt check...");
        LocalDate today = LocalDate.now();
        List<Debt> overdueDebts = debtRepository.findOverdueDebts(today);

        for (Debt debt : overdueDebts) {
            try {
                if (debt.getStatus() != DebtStatus.OVERDUE) {
                    debt.setStatus(DebtStatus.OVERDUE);
                    debtRepository.save(debt);
                }

                long daysOverdue = ChronoUnit.DAYS.between(debt.getDueDate(), today);
                String formattedAmount = String.format("%,.0f", debt.getRemainingAmount());

                notificationService.createGlobalNotification(
                        "Muddati o'tgan qarz!",
                        String.format("%s ning qarzi %s so'm. Muddati %d kun oldin o'tgan!",
                                debt.getPersonName(), formattedAmount, daysOverdue),
                        StaffNotificationType.DEBT_REMINDER,
                        "DEBT",
                        debt.getId()
                );
            } catch (Exception e) {
                log.error("Failed to process overdue debt ID: {}", debt.getId(), e);
            }
        }

        log.info("Overdue debt check completed. Found {} overdue debts", overdueDebts.size());
    }

    @Scheduled(cron = "0 0 2 * * *")
    public void cleanupOldNotifications() {
        log.info("Starting notification cleanup...");
        int deleted = notificationService.cleanupOldNotifications();
        log.info("Notification cleanup completed. Deleted {} old notifications", deleted);
    }

    /**
     * Har kuni soat 00:05 da recurring tranzaksiyalarni avtomatik yaratadi.
     * Idempotent — qayta ishlatilsa, takror tranzaksiya yaratilmaydi.
     */
    @Scheduled(cron = "0 5 0 * * *")
    public void executeRecurringTransactions() {
        log.info("Recurring transactions executor boshlanmoqda...");
        int created = recurringTransactionService.executeDueRecurringTransactions(LocalDate.now());
        log.info("Recurring transactions executor tugadi. {} ta yangi tranzaksiya yaratildi", created);
    }

    /**
     * D5: har kuni 02:30 da retention'dan eski audit loglarni o'chiradi. Avval cleanup
     * mexanizmi yo'q edi — audit_logs jadvali cheksiz o'sardi (prod-barqarorlik).
     */
    @Scheduled(cron = "0 30 2 * * *")
    public void cleanupOldAuditLogs() {
        log.info("Audit log retention cleanup boshlanmoqda...");
        auditLogService.cleanupOldLogs();
    }
}
