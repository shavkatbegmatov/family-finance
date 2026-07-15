package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.dto.request.TransactionRequest;
import uz.familyfinance.api.dto.response.TransactionResponse;
import uz.familyfinance.api.entity.*;
import uz.familyfinance.api.enums.TransactionStatus;
import uz.familyfinance.api.enums.TransactionType;
import uz.familyfinance.api.enums.AccountStatus;
import uz.familyfinance.api.exception.BadRequestException;
import uz.familyfinance.api.exception.ResourceNotFoundException;
import uz.familyfinance.api.dto.request.BulkCategorizeRequest;
import uz.familyfinance.api.dto.request.BulkReverseRequest;
import uz.familyfinance.api.dto.request.TransactionSplitItem;
import uz.familyfinance.api.dto.response.BulkOperationResponse;
import uz.familyfinance.api.dto.response.BulkOperationResponse.BulkOperationFailure;
import uz.familyfinance.api.entity.BudgetAlert;
import uz.familyfinance.api.entity.TransactionSplit;
import uz.familyfinance.api.enums.BudgetAlertThreshold;
import uz.familyfinance.api.enums.StaffNotificationType;
import uz.familyfinance.api.repository.*;

import java.util.ArrayList;

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
    private final BudgetAlertRepository budgetAlertRepository;
    private final StaffNotificationService notificationService;
    private final AccountService accountService;
    private final TagService tagService;
    private final TransactionSplitRepository transactionSplitRepository;
    private final ScopeContextService scopeContext;

    /**
     * O'z-o'ziga proxy havola — bulkReverse() ichidan reverse() ni Spring
     * proxy orqali chaqirish uchun. To'g'ridan-to'g'ri this.reverse() self-
     * invocation bo'lib, @Transactional o'tkazib yuborilardi (TransactionRequired
     * → har element xato → bulk butunlay ishlamasdi). @Lazy — aylanma bog'liqlik
     * (o'ziga) startup'da muammo qilmasligi uchun.
     */
    @Autowired
    @Lazy
    private TransactionService self;

    /**
     * Aktiv scope ID ni qaytaradi (D1-b: tranzaksiyalar to'g'ridan {@code t.scope.id} bo'yicha
     * filtrlanadi — avval bilvosita aktiv scope → klan → legacy familyGroup orqali edi).
     * SUPER_ADMIN → null (query global, barchasini ko'radi); aktiv scope topilmasa → -1
     * (hech bir tranzaksiya mos kelmaydi, xavfsiz default). Accounts naqshiga izchil
     * ({@code getActiveScopeIdOrNull}).
     */
    private Long resolveActiveScopeIdOrNull() {
        if (scopeContext.isSuperAdmin()) {
            return null; // SUPER_ADMIN barcha tranzaksiyalarni ko'radi
        }
        try {
            Long scopeId = scopeContext.getActiveScopeIdOrNull();
            return scopeId != null ? scopeId : -1L; // -1 = hech bir tranzaksiya mos kelmaydi (xavfsiz default)
        } catch (Exception e) {
            log.warn("Aktiv scope olib bo'lmadi: {}", e.getMessage());
            return -1L;
        }
    }

    @Transactional(readOnly = true)
    public Page<TransactionResponse> getAll(TransactionType type, Long accountId, Long categoryId,
                                              Long memberId, LocalDateTime from, LocalDateTime to,
                                              String search, Pageable pageable) {
        String normalizedSearch = (search == null || search.isBlank()) ? null : search.trim();
        Long scopeId = resolveActiveScopeIdOrNull();
        return transactionRepository.findWithFilters(scopeId, type, accountId, categoryId, memberId,
                                                       from, to, null, normalizedSearch, pageable)
                .map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public TransactionResponse getById(Long id) {
        return toResponse(findById(id));
    }

    @Transactional(readOnly = true)
    public List<TransactionResponse> getRecent() {
        Long scopeId = resolveActiveScopeIdOrNull();
        if (scopeId == null) {
            // SUPER_ADMIN — eski global qaytaradi
            return transactionRepository.findTop10ByOrderByTransactionDateDesc().stream()
                    .map(this::toResponse).collect(Collectors.toList());
        }
        return transactionRepository
                .findTop10ByScope(scopeId, org.springframework.data.domain.PageRequest.of(0, 10))
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    /**
     * Berilgan scope'ning oxirgi 10 tranzaksiyasi — SUPER_ADMIN bitta oilani read-only
     * ko'rishi uchun ({@code AdminOverviewService}). {@link #getRecent()}'dan farqli: global
     * emas, aniq scopeId bo'yicha.
     */
    @Transactional(readOnly = true)
    public List<TransactionResponse> getRecentForScope(Long scopeId) {
        return transactionRepository
                .findTop10ByScope(scopeId, org.springframework.data.domain.PageRequest.of(0, 10))
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    /**
     * Hisob faol (ACTIVE) ekanligini tekshiradi. FROZEN/CLOSED bo'lsa
     * tranzaksiya kiritishni to'sib, tushunarli xatolik qaytaradi.
     */
    private void ensureAccountActive(Account account) {
        if (account.getStatus() != AccountStatus.ACTIVE) {
            String holat = account.getStatus() == AccountStatus.FROZEN ? "muzlatilgan" : "yopilgan";
            throw new BadRequestException(
                    "Hisob " + holat + " holatda bo'lgani uchun unga tranzaksiya kiritib bo'lmaydi");
        }
    }

    /**
     * D7: O'tkazmada (TRANSFER) jo'natuvchi va qabul qiluvchi hisob valyutasi bir xil
     * bo'lishi shart. Valyuta kursi (FX) tizimi hozircha yo'q — turli valyutali o'tkazma
     * summani o'zgartirmasdan ko'chirib balansni buzadi (masalan 1000 UZS → 1000 USD).
     * Shuning uchun bunday o'tkazmani rad etamiz (kelajakda exchange_rates bilan
     * konvertatsiya). Taqqoslash case/probelga bardoshli (currency drift'ni sindirmaslik uchun).
     */
    private void ensureSameCurrency(Account from, Account to) {
        if (!isSameCurrency(from.getCurrency(), to.getCurrency())) {
            throw new BadRequestException(
                    "Turli valyutali hisoblar o'rtasida o'tkazma qilib bo'lmaydi: "
                            + from.getCurrency() + " → " + to.getCurrency());
        }
    }

    /**
     * Valyuta tengligini case/probelga bardoshli taqqoslaydi (currency drift'ni
     * sindirmaslik uchun). Package-private static — unit test bevosita tekshiradi.
     */
    static boolean isSameCurrency(String a, String b) {
        String x = a == null ? "" : a.trim();
        String y = b == null ? "" : b.trim();
        return x.equalsIgnoreCase(y);
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
        return doCreate(request, true);
    }

    /**
     * Tizim oqimi (recurring scheduler) uchun tranzaksiya yaratish — foydalanuvchi
     * auth-konteksti yo'q. Recurring shablon yaratilganda hisobga yozish huquqi
     * allaqachon tekshirilgan, shu sabab bu yerda qayta tekshirilmaydi (aks holda
     * scheduler thread'ida getCurrentUser null bo'lib, barcha takrorlanuvchi
     * tranzaksiyalar jimgina ishlamay qolardi).
     */
    @Transactional
    public TransactionResponse createSystem(TransactionRequest request) {
        return doCreate(request, false);
    }

    private TransactionResponse doCreate(TransactionRequest request, boolean enforceAccess) {
        validateSplits(request);
        Account account = accountRepository.findById(request.getAccountId())
                .orElseThrow(() -> new ResourceNotFoundException("Hisob topilmadi"));

        // IDOR himoyasi: faqat o'zi yoza oladigan hisobga tranzaksiya kiritsin
        // (tizim oqimida o'tkazib yuboriladi — yuqoridagi createSystem izohiga qarang)
        if (enforceAccess) {
            accountService.assertCanModify(account);
        }

        // FROZEN/CLOSED holatdagi hisobga tranzaksiya kiritib bo'lmaydi
        ensureAccountActive(account);

        Transaction transaction = Transaction.builder()
                .type(request.getType())
                .amount(request.getAmount())
                .account(account)
                .scope(account.getHomeScope()) // D1: tranzaksiya scope'i = asosiy hisob scope'i (null = system/SYSTEM_TRANSIT)
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

        // Tags
        if (request.getTagIds() != null && !request.getTagIds().isEmpty()) {
            transaction.setTagEntities(tagService.findByIds(request.getTagIds()));
        }

        // Double-Entry mantiq
        // TRANSFER'da qabul qiluvchi hisobning yuklash + tekshiruvlari (huquq, faollik,
        // valyuta) bu yerda — chunki ular CREATE oqimiga xos (enforceAccess, majburiy
        // toAccount). Debit/credit aniqlash va balans qo'llash umumiy helper'larga chiqarilgan.
        Account toAccount = null;
        if (request.getType() == TransactionType.TRANSFER) {
            if (request.getToAccountId() == null) {
                throw new BadRequestException("O'tkazma uchun qabul qiluvchi hisob kerak");
            }
            toAccount = accountRepository.findById(request.getToAccountId())
                    .orElseThrow(() -> new ResourceNotFoundException("Qabul qiluvchi hisob topilmadi"));
            // O'tkazmada qabul qiluvchi hisobga ham yozish huquqi tekshiriladi
            if (enforceAccess) {
                accountService.assertCanModify(toAccount);
            }
            ensureAccountActive(toAccount);
            ensureSameCurrency(account, toAccount); // D7: turli valyutali o'tkazma balansni buzadi
            transaction.setToAccount(toAccount);
        }

        DebitCredit dc = resolveDebitCredit(request.getType(), account, toAccount,
                "Noto'g'ri tranzaksiya turi: " + request.getType());

        // Snapshot + balanslarni qo'llash (CREATE va UPDATE'da bir xil mantiq)
        applyDebitCredit(transaction, dc, request.getAmount());

        // Eski balance update (backward compatibility)
        // account va toAccount balanslar allaqachon debit/credit orqali yangilangan

        Transaction saved = transactionRepository.save(transaction);

        // Splits
        if (request.getSplits() != null && !request.getSplits().isEmpty()) {
            saveSplits(saved, request.getSplits());
        }

        // Check budget warnings for expenses (C3: faqat shu tranzaksiya scope'ida)
        if (request.getType() == TransactionType.EXPENSE && request.getCategoryId() != null) {
            Long scopeId = saved.getAccount().getHomeScope() != null
                    ? saved.getAccount().getHomeScope().getId()
                    : null;
            checkBudgetWarning(request.getCategoryId(), scopeId, request.getAmount());
        }

        log.info("Tranzaksiya yaratildi: {} {} (debit: {}, credit: {})",
                request.getType(), request.getAmount(),
                dc.debit().getAccCode(), dc.credit().getAccCode());

        return toResponse(saved);
    }

    @Transactional
    public TransactionResponse update(Long id, TransactionRequest request) {
        validateSplits(request);
        Transaction existing = findById(id);
        accountService.assertCanModify(existing.getAccount());

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

        // IDOR himoyasi: foydalanuvchi YANGI hisobga ham yoza olishi shart. Avval faqat
        // eski hisob tekshirilardi — begona (boshqa scope) hisobga tranzaksiyani ko'chirib,
        // uning balansini o'zgartirish mumkin edi.
        accountService.assertCanModify(account);

        // D4: UPDATE'da ham muzlatilgan/yopilgan hisob rad etiladi (avval faqat CREATE tekshirardi)
        ensureAccountActive(account);

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

        // Tags
        if (request.getTagIds() != null) {
            existing.setTagEntities(tagService.findByIds(request.getTagIds()));
        }

        // Yangi double-entry mantiq
        // TRANSFER'da qabul qiluvchi hisob ixtiyoriy (null bo'lsa o'tkazma → o'ziga
        // "self" debit) — bu UPDATE oqimiga xos, shu sabab bu yerda. Debit/credit
        // aniqlash va balans qo'llash CREATE bilan umumiy helper'larda.
        Account toAccount = null;
        if (request.getType() == TransactionType.TRANSFER) {
            if (request.getToAccountId() != null) {
                toAccount = accountRepository.findById(request.getToAccountId())
                        .orElseThrow(() -> new ResourceNotFoundException("Qabul qiluvchi hisob topilmadi"));
                accountService.assertCanModify(toAccount); // IDOR: qabul qiluvchi hisobga yozish huquqi
                ensureAccountActive(toAccount); // D4: qabul qiluvchi hisob ham faol bo'lishi shart
                ensureSameCurrency(account, toAccount); // D7: turli valyutali o'tkazma balansni buzadi
                existing.setToAccount(toAccount);
            } else {
                existing.setToAccount(null);
            }
        }

        DebitCredit dc = resolveDebitCredit(request.getType(), account, toAccount,
                "Noto'g'ri tranzaksiya turi");

        // Snapshot + yangi balanslarni qo'llash (CREATE va UPDATE'da bir xil mantiq)
        applyDebitCredit(existing, dc, request.getAmount());

        Transaction savedExisting = transactionRepository.save(existing);

        // Splits — update rejimida ham yangilanadi
        if (request.getSplits() != null) {
            if (request.getSplits().isEmpty()) {
                transactionSplitRepository.deleteByTransactionId(savedExisting.getId());
            } else {
                saveSplits(savedExisting, request.getSplits());
            }
        }

        return toResponse(savedExisting);
    }

    /**
     * Tranzaksiyani storno (reverse) qiladi.
     * Asl tranzaksiya REVERSED holatga o'tadi va teskari REVERSAL tranzaksiya yaratiladi.
     */
    @Transactional
    public TransactionResponse reverse(Long id, String reason) {
        Transaction original = findById(id);
        accountService.assertCanModify(original.getAccount());

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
                .scope(original.getScope()) // D1: storno asl tranzaksiya scope'ini meros qiladi
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
    public Page<TransactionResponse> getByAccount(Long accountId, Pageable pageable) {
        // IDOR himoyasi: faqat o'zi kira oladigan hisob tranzaksiyalari
        accountService.assertCanAccess(accountService.findById(accountId));
        return transactionRepository.findByAccountId(accountId, pageable).map(this::toResponse);
    }

    @Transactional
    public TransactionResponse confirm(Long id) {
        Transaction transaction = findById(id);
        accountService.assertCanModify(transaction.getAccount());

        if (transaction.getStatus() != TransactionStatus.PENDING) {
            throw new BadRequestException("Faqat PENDING holatdagi tranzaksiyani tasdiqlash mumkin");
        }

        transaction.setStatus(TransactionStatus.CONFIRMED);

        // Balanslarni yangilash
        if (transaction.getDebitAccount() != null && transaction.getCreditAccount() != null) {
            accountRepository.addToBalance(transaction.getDebitAccount().getId(), transaction.getAmount());
            accountRepository.addToBalance(transaction.getCreditAccount().getId(), transaction.getAmount().negate());

            transaction.setBalanceAfterDebit(transaction.getDebitAccount().getBalance().add(transaction.getAmount()));
            transaction.setBalanceAfterCredit(transaction.getCreditAccount().getBalance().subtract(transaction.getAmount()));
        }

        log.info("Tranzaksiya tasdiqlandi: #{}", id);
        return toResponse(transactionRepository.save(transaction));
    }

    @Transactional
    public TransactionResponse cancel(Long id, String reason) {
        Transaction transaction = findById(id);
        accountService.assertCanModify(transaction.getAccount());

        if (transaction.getStatus() == TransactionStatus.REVERSED) {
            throw new BadRequestException("Allaqachon bekor qilingan tranzaksiyani qayta bekor qilib bo'lmaydi");
        }

        // Agar CONFIRMED bo'lsa, balanslarni qaytarish
        if (transaction.getStatus() == TransactionStatus.CONFIRMED) {
            if (transaction.getDebitAccount() != null && transaction.getCreditAccount() != null) {
                accountRepository.addToBalance(transaction.getDebitAccount().getId(), transaction.getAmount().negate());
                accountRepository.addToBalance(transaction.getCreditAccount().getId(), transaction.getAmount());
            } else {
                reverseAccountBalances(transaction.getType(), transaction.getAccount(),
                        transaction.getToAccount(), transaction.getAmount());
            }
        }

        transaction.setStatus(TransactionStatus.REVERSED);
        transaction.setDescription(transaction.getDescription() + " [BEKOR QILINDI: " + (reason != null ? reason : "") + "]");

        log.info("Tranzaksiya bekor qilindi: #{}, sabab: {}", id, reason);
        return toResponse(transactionRepository.save(transaction));
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

    /**
     * Double-Entry debit/credit juftligi (immutable holder).
     */
    private record DebitCredit(Account debit, Account credit) {}

    /**
     * Tranzaksiya turiga ko'ra debit/credit hisoblarni aniqlaydi — CREATE va UPDATE
     * oqimlari uchun yagona manba (DRY). Natija ikkala oqimda ham AYNAN bir xil:
     * <ul>
     *   <li>INCOME:   debit = foydalanuvchi hisobi, credit = daromad tranziti</li>
     *   <li>EXPENSE:  debit = xarajat tranziti, credit = foydalanuvchi hisobi</li>
     *   <li>TRANSFER: debit = qabul qiluvchi hisob (yo'q bo'lsa o'ziga), credit = jo'natuvchi</li>
     * </ul>
     * TRANSFER'da {@code toAccount} aniqlash/tekshirish chaqiruvchida bajariladi
     * (CREATE va UPDATE'da farq qiladi); bu yerda faqat juftlik tanlanadi.
     *
     * @param toAccount TRANSFER qabul qiluvchi hisob; {@code null} bo'lsa debit = jo'natuvchi
     *                  ({@code account}) — UPDATE'dagi "self-transfer" holatiga mos
     * @param invalidTypeMessage INCOME/EXPENSE/TRANSFER'dan boshqa tur uchun xato matni
     *                           (chaqiruvchining asl matnini AYNAN saqlash uchun)
     */
    private DebitCredit resolveDebitCredit(TransactionType type, Account account, Account toAccount,
                                           String invalidTypeMessage) {
        switch (type) {
            case INCOME:
                return new DebitCredit(account, // Pul tushayotgan hisob
                        accountService.findTransitAccount(account.getCurrency(), true));
            case EXPENSE:
                return new DebitCredit(
                        accountService.findTransitAccount(account.getCurrency(), false),
                        account); // Pul chiqayotgan hisob
            case TRANSFER:
                Account debit = toAccount != null ? toAccount : account; // Pul tushayotgan hisob
                return new DebitCredit(debit, account); // credit = pul chiqayotgan (jo'natuvchi)
            default:
                throw new BadRequestException(invalidTypeMessage);
        }
    }

    /**
     * Tranzaksiyaga debit/credit snapshot'larini yozadi va hisob balanslarini qo'llaydi.
     * CREATE va UPDATE oqimlarida AYNAN bir xil ketma-ketlik (DRY): debit += amount,
     * credit -= amount; before/after balanslar saqlab qolinadi.
     */
    private void applyDebitCredit(Transaction tx, DebitCredit dc, BigDecimal amount) {
        Account debitAccount = dc.debit();
        Account creditAccount = dc.credit();

        // Balance before snapshot
        tx.setDebitAccount(debitAccount);
        tx.setCreditAccount(creditAccount);
        tx.setBalanceBeforeDebit(debitAccount.getBalance());
        tx.setBalanceBeforeCredit(creditAccount.getBalance());

        // Balanslarni yangilash
        accountRepository.addToBalance(debitAccount.getId(), amount);
        accountRepository.addToBalance(creditAccount.getId(), amount.negate());

        // Balance after snapshot
        tx.setBalanceAfterDebit(debitAccount.getBalance().add(amount));
        tx.setBalanceAfterCredit(creditAccount.getBalance().subtract(amount));
    }

    /**
     * Ko'p tranzaksiyani birgalikda storno qilish.
     * Har biri alohida ishlanadi — bir tranzaksiyaning xatosi qolganlarini buzmaydi.
     */
    public BulkOperationResponse bulkReverse(BulkReverseRequest request) {
        List<BulkOperationFailure> failures = new ArrayList<>();
        int successCount = 0;
        for (Long id : request.getTransactionIds()) {
            try {
                // Proxy orqali — har storno o'z tranzaksiyasida bajariladi
                // (partial-success: bir element xatosi qolganlarini buzmaydi)
                self.reverse(id, request.getReason());
                successCount++;
            } catch (Exception e) {
                log.warn("Bulk reverse: tranzaksiya {} storno qilinmadi: {}", id, e.getMessage());
                failures.add(BulkOperationFailure.builder()
                        .transactionId(id)
                        .reason(e.getMessage())
                        .build());
            }
        }
        return BulkOperationResponse.builder()
                .successCount(successCount)
                .failures(failures)
                .build();
    }

    /**
     * Ko'p tranzaksiyaga bir vaqtning o'zida kategoriya o'rnatish.
     * REVERSED holatdagi tranzaksiyalar e'tiborga olinmaydi.
     */
    @Transactional
    public BulkOperationResponse bulkCategorize(BulkCategorizeRequest request) {
        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Kategoriya topilmadi"));

        List<BulkOperationFailure> failures = new ArrayList<>();
        int successCount = 0;
        for (Long id : request.getTransactionIds()) {
            try {
                Transaction tx = findById(id);
                accountService.assertCanModify(tx.getAccount());
                if (tx.getStatus() == TransactionStatus.REVERSED) {
                    failures.add(BulkOperationFailure.builder()
                            .transactionId(id)
                            .reason("Storno qilingan tranzaksiyani o'zgartirib bo'lmaydi")
                            .build());
                    continue;
                }
                tx.setCategory(category);
                transactionRepository.save(tx);
                successCount++;
            } catch (Exception e) {
                log.warn("Bulk categorize: tranzaksiya {} o'zgartirilmadi: {}", id, e.getMessage());
                failures.add(BulkOperationFailure.builder()
                        .transactionId(id)
                        .reason(e.getMessage())
                        .build());
            }
        }
        return BulkOperationResponse.builder()
                .successCount(successCount)
                .failures(failures)
                .build();
    }

    /**
     * Split'lar yig'indisi tranzaksiya summasiga teng bo'lishi kerak.
     */
    private void validateSplits(TransactionRequest request) {
        if (request.getSplits() == null || request.getSplits().isEmpty()) return;
        if (request.getType() == TransactionType.TRANSFER) {
            throw new BadRequestException("TRANSFER tranzaksiyani bo'lib bo'lmaydi");
        }
        BigDecimal sum = request.getSplits().stream()
                .map(TransactionSplitItem::getAmount)
                .filter(java.util.Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (sum.compareTo(request.getAmount()) != 0) {
            throw new BadRequestException("Split summasi tranzaksiya summasiga teng bo'lishi kerak");
        }
    }

    /**
     * Yangi split'larni saqlash. Eski splitlar tozalanadi.
     */
    private void saveSplits(Transaction transaction, List<TransactionSplitItem> items) {
        transactionSplitRepository.deleteByTransactionId(transaction.getId());
        for (TransactionSplitItem item : items) {
            Category category = categoryRepository.findById(item.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Kategoriya topilmadi: " + item.getCategoryId()));
            transactionSplitRepository.save(TransactionSplit.builder()
                    .transaction(transaction)
                    .category(category)
                    .amount(item.getAmount())
                    .note(item.getNote())
                    .build());
        }
    }

    private void checkBudgetWarning(Long categoryId, Long scopeId, BigDecimal expenseAmount) {
        // C3: scope'siz (masalan SYSTEM_TRANSIT hisob) tranzaksiyaga byudjet ogohlantirishi yo'q
        if (scopeId == null) {
            return;
        }
        LocalDate today = LocalDate.now();
        // C3: byudjet va xarajat FAQAT shu scope'da qidiriladi (boshqa urug'/xonadon emas)
        budgetRepository.findFirstByCategoryIdAndScopeIdAndIsActiveTrueAndStartDateLessThanEqualAndEndDateGreaterThanEqualOrderByEndDateDesc(
                categoryId, scopeId, today, today).ifPresent(budget -> {
            LocalDateTime from = budget.getStartDate().atStartOfDay();
            LocalDateTime to = budget.getEndDate().atTime(23, 59, 59);
            BigDecimal directSpent = transactionRepository.sumExpenseByCategoryAndScopeAndDateRange(categoryId, scopeId, from, to);
            BigDecimal splitSpent = transactionSplitRepository.sumExpenseByCategoryAndScopeAndDateRange(categoryId, scopeId, from, to);
            BigDecimal totalSpent = directSpent.add(splitSpent);
            BigDecimal percentage = totalSpent.multiply(BigDecimal.valueOf(100))
                    .divide(budget.getAmount(), 2, RoundingMode.HALF_UP);

            // 100% chegarasi avval tekshiriladi — agar oshib ketgan bo'lsa, faqat EXCEEDED alert yuboriladi
            if (percentage.compareTo(BudgetAlertThreshold.EXCEEDED.getPercentBigDecimal()) >= 0) {
                sendBudgetAlertOnce(budget, BudgetAlertThreshold.EXCEEDED, percentage,
                        "Byudjet oshib ketdi!",
                        StaffNotificationType.BUDGET_EXCEEDED);
            } else if (percentage.compareTo(BudgetAlertThreshold.WARNING.getPercentBigDecimal()) >= 0) {
                sendBudgetAlertOnce(budget, BudgetAlertThreshold.WARNING, percentage,
                        "Byudjet ogohlantirishi",
                        StaffNotificationType.BUDGET_WARNING);
            }
        });
    }

    /**
     * Bir budget davri ichida bir threshold uchun faqat bitta notifikatsiya yuboriladi (idempotent).
     */
    private void sendBudgetAlertOnce(uz.familyfinance.api.entity.Budget budget,
                                       BudgetAlertThreshold threshold,
                                       BigDecimal percentage,
                                       String title,
                                       StaffNotificationType notificationType) {
        if (budgetAlertRepository.existsByBudgetIdAndThreshold(budget.getId(), threshold.getPercent())) {
            return;
        }
        // Scoped: byudjet ogohlantirishi faqat shu byudjet scope'i a'zolariga (V61).
        notificationService.createScopedNotification(
                budget.getScope(),
                title,
                String.format("Kategoriya byudjeti %s%% sarflandi", percentage),
                notificationType,
                "BUDGET",
                budget.getId());
        budgetAlertRepository.save(BudgetAlert.builder()
                .budget(budget)
                .threshold(threshold.getPercent())
                .sentAt(LocalDateTime.now())
                .build());
    }

    private Transaction findById(Long id) {
        Transaction tx = transactionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tranzaksiya topilmadi: " + id));
        // IDOR himoyasi: tranzaksiya o'z scope'iga ega emas — uning hisobiga
        // kirish huquqi orqali tekshiriladi (barcha by-id metodlar shu yerdan o'tadi).
        accountService.assertCanAccess(tx.getAccount());
        return tx;
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

        // Tags
        if (t.getTagEntities() != null && !t.getTagEntities().isEmpty()) {
            r.setTagIds(t.getTagEntities().stream()
                    .map(uz.familyfinance.api.entity.Tag::getId)
                    .collect(java.util.stream.Collectors.toSet()));
        }

        // Splits
        java.util.List<uz.familyfinance.api.entity.TransactionSplit> splits =
                transactionSplitRepository.findByTransactionId(t.getId());
        if (!splits.isEmpty()) {
            r.setSplits(splits.stream()
                    .map(s -> {
                        uz.familyfinance.api.dto.response.TransactionSplitResponse sr =
                                new uz.familyfinance.api.dto.response.TransactionSplitResponse();
                        sr.setId(s.getId());
                        sr.setAmount(s.getAmount());
                        sr.setNote(s.getNote());
                        if (s.getCategory() != null) {
                            sr.setCategoryId(s.getCategory().getId());
                            sr.setCategoryName(s.getCategory().getName());
                        }
                        return sr;
                    })
                    .toList());
        }

        return r;
    }
}
