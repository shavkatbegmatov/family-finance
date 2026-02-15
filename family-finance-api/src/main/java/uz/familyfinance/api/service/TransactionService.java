package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.dto.request.TransactionRequest;
import uz.familyfinance.api.dto.response.TransactionResponse;
import uz.familyfinance.api.entity.*;
import uz.familyfinance.api.enums.TransactionStatus;
import uz.familyfinance.api.enums.TransactionType;
import uz.familyfinance.api.exception.BadRequestException;
import uz.familyfinance.api.exception.ResourceNotFoundException;
import uz.familyfinance.api.repository.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final AccountRepository accountRepository;
    private final CategoryRepository categoryRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final BudgetRepository budgetRepository;
    private final StaffNotificationService notificationService;
    private final AccountService accountService;

    @Transactional(readOnly = true)
    public Page<TransactionResponse> getAll(TransactionType type, Long accountId, Long categoryId,
                                              Long memberId, LocalDateTime from, LocalDateTime to,
                                              Pageable pageable) {
        return transactionRepository.findWithFilters(type, accountId, categoryId, memberId, from, to, null, pageable)
                .map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public TransactionResponse getById(Long id) {
        return toResponse(findById(id));
    }

    @Transactional(readOnly = true)
    public List<TransactionResponse> getRecent() {
        return transactionRepository.findTop10ByOrderByTransactionDateDesc().stream()
                .map(this::toResponse).collect(Collectors.toList());
    }

    /**
     * Yangi tranzaksiya yaratadi — to'liq Double-Entry mantiq bilan.
     *
     * INCOME:   debit = foydalanuvchi hisobi (pul tushdi), credit = tranzit daromad hisobi
     * EXPENSE:  debit = tranzit xarajat hisobi, credit = foydalanuvchi hisobi (pul chiqdi)
     * TRANSFER: debit = qabul qiluvchi hisob, credit = jo'natuvchi hisob
     */
    @Transactional
    public TransactionResponse create(TransactionRequest request) {
        Account account = accountRepository.findById(request.getAccountId())
                .orElseThrow(() -> new ResourceNotFoundException("Hisob topilmadi"));

        Transaction transaction = Transaction.builder()
                .type(request.getType())
                .amount(request.getAmount())
                .account(account)
                .transactionDate(request.getTransactionDate())
                .description(request.getDescription())
                .isRecurring(request.getIsRecurring() != null ? request.getIsRecurring() : false)
                .recurringPattern(request.getRecurringPattern())
                .tags(request.getTags())
                .status(TransactionStatus.CONFIRMED)
                .build();

        // Set category
        if (request.getCategoryId() != null) {
            Category category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Kategoriya topilmadi"));
            transaction.setCategory(category);
        }

        // Set family member
        if (request.getFamilyMemberId() != null) {
            FamilyMember member = familyMemberRepository.findById(request.getFamilyMemberId())
                    .orElseThrow(() -> new ResourceNotFoundException("Oila a'zosi topilmadi"));
            transaction.setFamilyMember(member);
        }

        // Double-Entry mantiq
        Account debitAccount;
        Account creditAccount;

        switch (request.getType()) {
            case INCOME:
                debitAccount = account; // Pul tushayotgan hisob
                creditAccount = accountService.findTransitAccount(account.getCurrency(), true);
                break;
            case EXPENSE:
                debitAccount = accountService.findTransitAccount(account.getCurrency(), false);
                creditAccount = account; // Pul chiqayotgan hisob
                break;
            case TRANSFER:
                if (request.getToAccountId() == null) {
                    throw new BadRequestException("O'tkazma uchun qabul qiluvchi hisob kerak");
                }
                Account toAccount = accountRepository.findById(request.getToAccountId())
                        .orElseThrow(() -> new ResourceNotFoundException("Qabul qiluvchi hisob topilmadi"));
                transaction.setToAccount(toAccount);
                debitAccount = toAccount;   // Pul tushayotgan hisob
                creditAccount = account;     // Pul chiqayotgan hisob
                break;
            default:
                throw new BadRequestException("Noto'g'ri tranzaksiya turi: " + request.getType());
        }

        // Balance before snapshot
        transaction.setDebitAccount(debitAccount);
        transaction.setCreditAccount(creditAccount);
        transaction.setBalanceBeforeDebit(debitAccount.getBalance());
        transaction.setBalanceBeforeCredit(creditAccount.getBalance());

        // Balanslarni yangilash
        accountRepository.addToBalance(debitAccount.getId(), request.getAmount());
        accountRepository.addToBalance(creditAccount.getId(), request.getAmount().negate());

        // Balance after snapshot
        transaction.setBalanceAfterDebit(debitAccount.getBalance().add(request.getAmount()));
        transaction.setBalanceAfterCredit(creditAccount.getBalance().subtract(request.getAmount()));

        // Eski balance update (backward compatibility)
        // account va toAccount balanslar allaqachon debit/credit orqali yangilangan

        Transaction saved = transactionRepository.save(transaction);

        // Check budget warnings for expenses
        if (request.getType() == TransactionType.EXPENSE && request.getCategoryId() != null) {
            checkBudgetWarning(request.getCategoryId(), request.getAmount());
        }

        log.info("Tranzaksiya yaratildi: {} {} (debit: {}, credit: {})",
                request.getType(), request.getAmount(),
                debitAccount.getAccCode(), creditAccount.getAccCode());

        return toResponse(saved);
    }

    @Transactional
    public TransactionResponse update(Long id, TransactionRequest request) {
        Transaction existing = findById(id);

        if (existing.getStatus() == TransactionStatus.REVERSED) {
            throw new BadRequestException("Storno qilingan tranzaksiyani o'zgartirib bo'lmaydi");
        }

        // Eski double-entry balanslarni qaytarish
        if (existing.getDebitAccount() != null && existing.getCreditAccount() != null) {
            accountRepository.addToBalance(existing.getDebitAccount().getId(), existing.getAmount().negate());
            accountRepository.addToBalance(existing.getCreditAccount().getId(), existing.getAmount());
        } else {
            // Eski format (backward compatibility)
            reverseAccountBalances(existing.getType(), existing.getAccount(),
                    existing.getToAccount(), existing.getAmount());
        }

        Account account = accountRepository.findById(request.getAccountId())
                .orElseThrow(() -> new ResourceNotFoundException("Hisob topilmadi"));

        existing.setType(request.getType());
        existing.setAmount(request.getAmount());
        existing.setAccount(account);
        existing.setTransactionDate(request.getTransactionDate());
        existing.setDescription(request.getDescription());
        existing.setIsRecurring(request.getIsRecurring() != null ? request.getIsRecurring() : false);
        existing.setRecurringPattern(request.getRecurringPattern());
        existing.setTags(request.getTags());

        if (request.getCategoryId() != null) {
            existing.setCategory(categoryRepository.findById(request.getCategoryId()).orElse(null));
        } else {
            existing.setCategory(null);
        }

        if (request.getFamilyMemberId() != null) {
            existing.setFamilyMember(familyMemberRepository.findById(request.getFamilyMemberId()).orElse(null));
        } else {
            existing.setFamilyMember(null);
        }

        // Yangi double-entry mantiq
        Account debitAccount;
        Account creditAccount;

        switch (request.getType()) {
            case INCOME:
                debitAccount = account;
                creditAccount = accountService.findTransitAccount(account.getCurrency(), true);
                break;
            case EXPENSE:
                debitAccount = accountService.findTransitAccount(account.getCurrency(), false);
                creditAccount = account;
                break;
            case TRANSFER:
                Account toAccount = null;
                if (request.getToAccountId() != null) {
                    toAccount = accountRepository.findById(request.getToAccountId())
                            .orElseThrow(() -> new ResourceNotFoundException("Qabul qiluvchi hisob topilmadi"));
                    existing.setToAccount(toAccount);
                } else {
                    existing.setToAccount(null);
                }
                debitAccount = toAccount != null ? toAccount : account;
                creditAccount = account;
                break;
            default:
                throw new BadRequestException("Noto'g'ri tranzaksiya turi");
        }

        existing.setDebitAccount(debitAccount);
        existing.setCreditAccount(creditAccount);
        existing.setBalanceBeforeDebit(debitAccount.getBalance());
        existing.setBalanceBeforeCredit(creditAccount.getBalance());

        // Yangi balanslarni qo'llash
        accountRepository.addToBalance(debitAccount.getId(), request.getAmount());
        accountRepository.addToBalance(creditAccount.getId(), request.getAmount().negate());

        existing.setBalanceAfterDebit(debitAccount.getBalance().add(request.getAmount()));
        existing.setBalanceAfterCredit(creditAccount.getBalance().subtract(request.getAmount()));

        return toResponse(transactionRepository.save(existing));
    }

    /**
     * Tranzaksiyani storno (reverse) qiladi.
     * Asl tranzaksiya REVERSED holatga o'tadi va teskari REVERSAL tranzaksiya yaratiladi.
     */
    @Transactional
    public TransactionResponse reverse(Long id, String reason) {
        Transaction original = findById(id);

        if (original.getStatus() == TransactionStatus.REVERSED) {
            throw new BadRequestException("Bu tranzaksiya allaqachon storno qilingan");
        }

        if (original.getType() == TransactionType.REVERSAL) {
            throw new BadRequestException("Storno tranzaksiyasini qayta storno qilib bo'lmaydi");
        }

        // Teskari tranzaksiya yaratish
        Transaction reversal = Transaction.builder()
                .type(TransactionType.REVERSAL)
                .amount(original.getAmount())
                .account(original.getAccount())
                .toAccount(original.getToAccount())
                .transactionDate(LocalDateTime.now())
                .description("STORNO: " + (reason != null ? reason : "") +
                        " (Asl tranzaksiya #" + original.getId() + ")")
                .status(TransactionStatus.CONFIRMED)
                .originalTransaction(original)
                .build();

        // Double-entry: debit va credit teskari
        if (original.getDebitAccount() != null && original.getCreditAccount() != null) {
            reversal.setDebitAccount(original.getCreditAccount());  // Teskari
            reversal.setCreditAccount(original.getDebitAccount());  // Teskari

            Account revDebit = original.getCreditAccount();
            Account revCredit = original.getDebitAccount();

            reversal.setBalanceBeforeDebit(revDebit.getBalance());
            reversal.setBalanceBeforeCredit(revCredit.getBalance());

            // Balanslarni qaytarish
            accountRepository.addToBalance(revDebit.getId(), original.getAmount());
            accountRepository.addToBalance(revCredit.getId(), original.getAmount().negate());

            reversal.setBalanceAfterDebit(revDebit.getBalance().add(original.getAmount()));
            reversal.setBalanceAfterCredit(revCredit.getBalance().subtract(original.getAmount()));
        } else {
            // Eski format tranzaksiyalar uchun backward compatibility
            reverseAccountBalances(original.getType(), original.getAccount(),
                    original.getToAccount(), original.getAmount());
        }

        // Category va family member ni ko'chirish
        reversal.setCategory(original.getCategory());
        reversal.setFamilyMember(original.getFamilyMember());

        Transaction savedReversal = transactionRepository.save(reversal);

        // Asl tranzaksiyani REVERSED ga o'zgartirish
        original.setStatus(TransactionStatus.REVERSED);
        original.setReversedBy(savedReversal);
        transactionRepository.save(original);

        log.info("Tranzaksiya storno qilindi: #{} -> #{}", original.getId(), savedReversal.getId());

        return toResponse(savedReversal);
    }

    @Transactional(readOnly = true)
    public BigDecimal getMonthlyIncome(int year, int month) {
        LocalDateTime from = LocalDateTime.of(year, month, 1, 0, 0);
        LocalDateTime to = from.plusMonths(1).minusSeconds(1);
        return transactionRepository.sumByTypeAndDateRange(TransactionType.INCOME, from, to);
    }

    @Transactional(readOnly = true)
    public BigDecimal getMonthlyExpense(int year, int month) {
        LocalDateTime from = LocalDateTime.of(year, month, 1, 0, 0);
        LocalDateTime to = from.plusMonths(1).minusSeconds(1);
        return transactionRepository.sumByTypeAndDateRange(TransactionType.EXPENSE, from, to);
    }

    private void reverseAccountBalances(TransactionType type, Account account, Account toAccount, BigDecimal amount) {
        switch (type) {
            case INCOME:
                accountRepository.addToBalance(account.getId(), amount.negate());
                break;
            case EXPENSE:
                accountRepository.addToBalance(account.getId(), amount);
                break;
            case TRANSFER:
                accountRepository.addToBalance(account.getId(), amount);
                if (toAccount != null) {
                    accountRepository.addToBalance(toAccount.getId(), amount.negate());
                }
                break;
        }
    }

    private void checkBudgetWarning(Long categoryId, BigDecimal expenseAmount) {
        LocalDate today = LocalDate.now();
        budgetRepository.findByCategoryIdAndIsActiveTrueAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                categoryId, today, today).ifPresent(budget -> {
            LocalDateTime from = budget.getStartDate().atStartOfDay();
            LocalDateTime to = budget.getEndDate().atTime(23, 59, 59);
            BigDecimal totalSpent = transactionRepository.sumExpenseByCategoryAndDateRange(categoryId, from, to);
            BigDecimal percentage = totalSpent.multiply(BigDecimal.valueOf(100))
                    .divide(budget.getAmount(), 2, RoundingMode.HALF_UP);

            if (percentage.compareTo(BigDecimal.valueOf(100)) >= 0) {
                notificationService.createGlobalNotification(
                        "Byudjet oshib ketdi!",
                        String.format("Kategoriya byudjeti %s%% sarflandi", percentage),
                        uz.familyfinance.api.enums.StaffNotificationType.BUDGET_EXCEEDED,
                        "BUDGET", budget.getId());
            } else if (percentage.compareTo(BigDecimal.valueOf(80)) >= 0) {
                notificationService.createGlobalNotification(
                        "Byudjet ogohlantirishi",
                        String.format("Kategoriya byudjeti %s%% sarflandi", percentage),
                        uz.familyfinance.api.enums.StaffNotificationType.BUDGET_WARNING,
                        "BUDGET", budget.getId());
            }
        });
    }

    private Transaction findById(Long id) {
        return transactionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tranzaksiya topilmadi: " + id));
    }

    private TransactionResponse toResponse(Transaction t) {
        TransactionResponse r = new TransactionResponse();
        r.setId(t.getId());
        r.setType(t.getType());
        r.setAmount(t.getAmount());
        r.setTransactionDate(t.getTransactionDate());
        r.setDescription(t.getDescription());
        r.setIsRecurring(t.getIsRecurring());
        r.setRecurringPattern(t.getRecurringPattern());
        r.setTags(t.getTags());
        r.setCreatedAt(t.getCreatedAt());
        r.setStatus(t.getStatus() != null ? t.getStatus().name() : "CONFIRMED");

        if (t.getAccount() != null) {
            r.setAccountId(t.getAccount().getId());
            r.setAccountName(t.getAccount().getName());
        }
        if (t.getToAccount() != null) {
            r.setToAccountId(t.getToAccount().getId());
            r.setToAccountName(t.getToAccount().getName());
        }
        if (t.getDebitAccount() != null) {
            r.setDebitAccountId(t.getDebitAccount().getId());
            r.setDebitAccountName(t.getDebitAccount().getName());
            r.setDebitAccCode(t.getDebitAccount().getAccCode());
        }
        if (t.getCreditAccount() != null) {
            r.setCreditAccountId(t.getCreditAccount().getId());
            r.setCreditAccountName(t.getCreditAccount().getName());
            r.setCreditAccCode(t.getCreditAccount().getAccCode());
        }
        if (t.getCategory() != null) {
            r.setCategoryId(t.getCategory().getId());
            r.setCategoryName(t.getCategory().getName());
        }
        if (t.getFamilyMember() != null) {
            r.setFamilyMemberId(t.getFamilyMember().getId());
            r.setFamilyMemberName(t.getFamilyMember().getFullName());
        }

        r.setBalanceBeforeDebit(t.getBalanceBeforeDebit());
        r.setBalanceAfterDebit(t.getBalanceAfterDebit());
        r.setBalanceBeforeCredit(t.getBalanceBeforeCredit());
        r.setBalanceAfterCredit(t.getBalanceAfterCredit());

        if (t.getOriginalTransaction() != null) {
            r.setOriginalTransactionId(t.getOriginalTransaction().getId());
        }

        return r;
    }
}
