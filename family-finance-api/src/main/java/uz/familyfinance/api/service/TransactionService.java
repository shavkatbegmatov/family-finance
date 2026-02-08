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
import uz.familyfinance.api.enums.BudgetPeriod;
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

    @Transactional(readOnly = true)
    public Page<TransactionResponse> getAll(TransactionType type, Long accountId, Long categoryId,
                                              Long memberId, LocalDateTime from, LocalDateTime to,
                                              Pageable pageable) {
        return transactionRepository.findWithFilters(type, accountId, categoryId, memberId, from, to, pageable)
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

        // Handle transfer
        if (request.getType() == TransactionType.TRANSFER) {
            if (request.getToAccountId() == null) {
                throw new BadRequestException("O'tkazma uchun qabul qiluvchi hisob kerak");
            }
            Account toAccount = accountRepository.findById(request.getToAccountId())
                    .orElseThrow(() -> new ResourceNotFoundException("Qabul qiluvchi hisob topilmadi"));
            transaction.setToAccount(toAccount);
        }

        // Update account balances
        updateAccountBalances(request.getType(), account,
                request.getToAccountId() != null ? accountRepository.findById(request.getToAccountId()).orElse(null) : null,
                request.getAmount());

        Transaction saved = transactionRepository.save(transaction);

        // Check budget warnings for expenses
        if (request.getType() == TransactionType.EXPENSE && request.getCategoryId() != null) {
            checkBudgetWarning(request.getCategoryId(), request.getAmount());
        }

        return toResponse(saved);
    }

    @Transactional
    public TransactionResponse update(Long id, TransactionRequest request) {
        Transaction existing = findById(id);

        // Reverse old balance changes
        reverseAccountBalances(existing.getType(), existing.getAccount(),
                existing.getToAccount(), existing.getAmount());

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

        Account toAccount = null;
        if (request.getType() == TransactionType.TRANSFER && request.getToAccountId() != null) {
            toAccount = accountRepository.findById(request.getToAccountId())
                    .orElseThrow(() -> new ResourceNotFoundException("Qabul qiluvchi hisob topilmadi"));
            existing.setToAccount(toAccount);
        } else {
            existing.setToAccount(null);
        }

        // Apply new balance changes
        updateAccountBalances(request.getType(), account, toAccount, request.getAmount());

        return toResponse(transactionRepository.save(existing));
    }

    @Transactional
    public void delete(Long id) {
        Transaction transaction = findById(id);
        reverseAccountBalances(transaction.getType(), transaction.getAccount(),
                transaction.getToAccount(), transaction.getAmount());
        transactionRepository.delete(transaction);
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

    private void updateAccountBalances(TransactionType type, Account account, Account toAccount, BigDecimal amount) {
        switch (type) {
            case INCOME:
                account.setBalance(account.getBalance().add(amount));
                accountRepository.save(account);
                break;
            case EXPENSE:
                account.setBalance(account.getBalance().subtract(amount));
                accountRepository.save(account);
                break;
            case TRANSFER:
                account.setBalance(account.getBalance().subtract(amount));
                accountRepository.save(account);
                if (toAccount != null) {
                    toAccount.setBalance(toAccount.getBalance().add(amount));
                    accountRepository.save(toAccount);
                }
                break;
        }
    }

    private void reverseAccountBalances(TransactionType type, Account account, Account toAccount, BigDecimal amount) {
        switch (type) {
            case INCOME:
                account.setBalance(account.getBalance().subtract(amount));
                accountRepository.save(account);
                break;
            case EXPENSE:
                account.setBalance(account.getBalance().add(amount));
                accountRepository.save(account);
                break;
            case TRANSFER:
                account.setBalance(account.getBalance().add(amount));
                accountRepository.save(account);
                if (toAccount != null) {
                    toAccount.setBalance(toAccount.getBalance().subtract(amount));
                    accountRepository.save(toAccount);
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

        if (t.getAccount() != null) {
            r.setAccountId(t.getAccount().getId());
            r.setAccountName(t.getAccount().getName());
        }
        if (t.getToAccount() != null) {
            r.setToAccountId(t.getToAccount().getId());
            r.setToAccountName(t.getToAccount().getName());
        }
        if (t.getCategory() != null) {
            r.setCategoryId(t.getCategory().getId());
            r.setCategoryName(t.getCategory().getName());
        }
        if (t.getFamilyMember() != null) {
            r.setFamilyMemberId(t.getFamilyMember().getId());
            r.setFamilyMemberName(t.getFamilyMember().getFullName());
        }
        return r;
    }
}
