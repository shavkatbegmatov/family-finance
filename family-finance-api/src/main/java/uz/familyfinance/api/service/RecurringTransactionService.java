package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.dto.request.TransactionRequest;
import uz.familyfinance.api.dto.response.TransactionResponse;
import uz.familyfinance.api.entity.RecurringTransactionExecution;
import uz.familyfinance.api.entity.Transaction;
import uz.familyfinance.api.enums.RecurringPattern;
import uz.familyfinance.api.repository.RecurringTransactionExecutionRepository;
import uz.familyfinance.api.repository.TransactionRepository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Recurring tranzaksiyalarni avtomatik bajarish.
 * Har kuni belgilangan vaqtda (FinanceScheduler ichidan) chaqiriladi.
 * Idempotent: bir kunda ikki marta ishlatilsa ham, qayta tranzaksiya yaratilmaydi.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RecurringTransactionService {

    private final TransactionRepository transactionRepository;
    private final RecurringTransactionExecutionRepository executionRepository;
    private final TransactionService transactionService;

    /**
     * Berilgan sanaga "due" bo'lgan recurring tranzaksiyalarni topib,
     * ularning har biridan yangi tranzaksiya yaratadi.
     *
     * @param forDate qaysi kun uchun executor ishga tushyapti
     * @return yaratilgan tranzaksiyalar soni
     */
    public int executeDueRecurringTransactions(LocalDate forDate) {
        List<Transaction> templates = transactionRepository.findRecurringTransactions();
        log.info("Recurring executor: {} ta template topildi {} sanasi uchun", templates.size(), forDate);

        int created = 0;
        for (Transaction template : templates) {
            if (executeSingleTemplate(template, forDate)) {
                created++;
            }
        }
        return created;
    }

    /**
     * Bitta template uchun alohida transactionda ishlaydi (REQUIRES_NEW).
     * Bir templatening xatosi qolganlarini buzmaydi.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean executeSingleTemplate(Transaction template, LocalDate forDate) {
        try {
            if (!isDue(template, forDate)) {
                return false;
            }
            if (executionRepository.existsByTemplateIdAndExecutionDate(template.getId(), forDate)) {
                log.debug("Recurring template {} {} sanasi uchun allaqachon bajarilgan", template.getId(), forDate);
                return false;
            }

            TransactionRequest request = buildRequestFromTemplate(template, forDate);
            // Tizim oqimi — auth-konteksti yo'q; shablon yaratilganda hisobga
            // yozish huquqi allaqachon tekshirilgan (createSystem guard'siz)
            TransactionResponse response = transactionService.createSystem(request);

            Transaction generated = transactionRepository.findById(response.getId())
                    .orElseThrow(() -> new IllegalStateException(
                            "Generated transaction not found: " + response.getId()));

            executionRepository.save(RecurringTransactionExecution.builder()
                    .template(template)
                    .generated(generated)
                    .executionDate(forDate)
                    .build());

            log.info("Recurring template {} -> yangi tranzaksiya {} yaratildi", template.getId(), generated.getId());
            return true;
        } catch (Exception e) {
            log.error("Recurring template {} ni bajarishda xatolik", template.getId(), e);
            return false;
        }
    }

    /**
     * Template'ning recurringPattern bo'yicha berilgan sana "due" bo'lganligini tekshirish.
     * Original template sanasi bilan taqqoslanadi.
     */
    private boolean isDue(Transaction template, LocalDate forDate) {
        if (template.getRecurringPattern() == null || template.getTransactionDate() == null) {
            return false;
        }
        LocalDate templateDate = template.getTransactionDate().toLocalDate();
        if (forDate.isBefore(templateDate) || forDate.isEqual(templateDate)) {
            // Template o'zining sanasida emas (yoki avval) — yangi tranzaksiya yaratilmaydi
            return false;
        }
        return switch (template.getRecurringPattern()) {
            case DAILY -> true;
            case WEEKLY -> forDate.getDayOfWeek() == templateDate.getDayOfWeek();
            case MONTHLY -> matchesMonthlyDay(templateDate, forDate);
            case YEARLY -> forDate.getMonth() == templateDate.getMonth()
                    && matchesMonthlyDay(templateDate, forDate);
        };
    }

    /**
     * Oy/Yil pattern uchun: 31-chi raqamlar uchun ham ishlash (masalan, Fevralda 28-chi/29-chida ham ishga tushadi).
     */
    private boolean matchesMonthlyDay(LocalDate templateDate, LocalDate forDate) {
        int templateDay = templateDate.getDayOfMonth();
        int forDay = forDate.getDayOfMonth();
        if (templateDay == forDay) return true;
        // Template kuni hozirgi oyning oxirgi kunidan katta bo'lsa, oxirgi kunda ishga tushiramiz
        int lastDayOfMonth = forDate.lengthOfMonth();
        return templateDay > lastDayOfMonth && forDay == lastDayOfMonth;
    }

    /**
     * Templatedan TransactionRequest qurish.
     * Yangi tranzaksiya isRecurring=false bo'ladi — qayta takrorlanmasin.
     */
    private TransactionRequest buildRequestFromTemplate(Transaction template, LocalDate forDate) {
        TransactionRequest request = new TransactionRequest();
        request.setType(template.getType());
        request.setAmount(template.getAmount());
        request.setAccountId(template.getAccount().getId());
        if (template.getToAccount() != null) {
            request.setToAccountId(template.getToAccount().getId());
        }
        if (template.getCategory() != null) {
            request.setCategoryId(template.getCategory().getId());
        }
        if (template.getFamilyMember() != null) {
            request.setFamilyMemberId(template.getFamilyMember().getId());
        }
        request.setTransactionDate(LocalDateTime.of(forDate, LocalDateTime.MIN.toLocalTime()));
        request.setDescription(buildAutoDescription(template));
        request.setIsRecurring(false);
        request.setRecurringPattern((RecurringPattern) null);
        request.setTags(template.getTags());
        return request;
    }

    private String buildAutoDescription(Transaction template) {
        String original = template.getDescription();
        String marker = "[Avtomatik takrorlangan]";
        if (original == null || original.isBlank()) {
            return marker;
        }
        if (original.startsWith(marker)) {
            return original;
        }
        return marker + " " + original;
    }
}
