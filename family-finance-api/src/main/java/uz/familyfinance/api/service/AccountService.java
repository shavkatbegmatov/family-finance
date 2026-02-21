package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.dto.request.AccountRequest;
import uz.familyfinance.api.dto.response.AccountAccessResponse;
import uz.familyfinance.api.dto.response.AccountBalanceSummaryResponse;
import uz.familyfinance.api.dto.response.AccountResponse;
import uz.familyfinance.api.dto.response.CardResponse;
import uz.familyfinance.api.entity.Account;
import uz.familyfinance.api.entity.FamilyMember;
import uz.familyfinance.api.enums.AccountAccessRole;
import uz.familyfinance.api.enums.AccountScope;
import uz.familyfinance.api.enums.AccountStatus;
import uz.familyfinance.api.enums.AccountType;
import uz.familyfinance.api.enums.CurrencyCode;
import uz.familyfinance.api.exception.BadRequestException;
import uz.familyfinance.api.exception.ResourceNotFoundException;
import uz.familyfinance.api.repository.AccountAccessRepository;
import uz.familyfinance.api.repository.AccountRepository;
import uz.familyfinance.api.repository.FamilyMemberRepository;
import uz.familyfinance.api.repository.TransactionRepository;
import uz.familyfinance.api.security.CustomUserDetails;
import uz.familyfinance.api.util.AccCodeGenerator;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AccountService {

    private final AccountRepository accountRepository;
    private final AccountAccessRepository accountAccessRepository;
    private final AccountAccessService accountAccessService;
    private final FamilyMemberRepository familyMemberRepository;
    private final TransactionRepository transactionRepository;

    @Transactional(readOnly = true)
    public Page<AccountResponse> getAll(String search, AccountType accountType, AccountStatus status,
            Pageable pageable, CustomUserDetails currentUser) {
        return accountRepository.findAccessibleAccounts(
                currentUser.getId(), currentUser.isAdmin(),
                search, accountType, status, pageable).map(a -> toResponseWithAccessRole(a, currentUser.getId()));
    }

    @Transactional(readOnly = true)
    public List<AccountResponse> getAllActive(CustomUserDetails currentUser) {
        return accountRepository.findAccessibleActiveAccounts(currentUser.getId(), currentUser.isAdmin())
                .stream()
                .map(a -> toResponseWithAccessRole(a, currentUser.getId()))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public AccountResponse getById(Long id, CustomUserDetails currentUser) {
        Account account = findById(id);
        checkAccess(account, currentUser);
        return toDetailedResponseWithAccessRole(account, currentUser.getId());
    }

    @Transactional(readOnly = true)
    public AccountResponse getByAccCode(String accCode, CustomUserDetails currentUser) {
        Account account = accountRepository.findByAccCode(accCode)
                .orElseThrow(() -> new ResourceNotFoundException("Hisob topilmadi: " + accCode));
        checkAccess(account, currentUser);
        return toDetailedResponseWithAccessRole(account, currentUser.getId());
    }

    @Transactional(readOnly = true)
    public BigDecimal getTotalBalance() {
        return accountRepository.getTotalBalance();
    }

    @Transactional
    public AccountResponse create(AccountRequest request, CustomUserDetails currentUser) {
        // Valyuta kodini aniqlash
        String currency = request.getCurrency() != null ? request.getCurrency() : "UZS";
        String currencyCode;
        try {
            currencyCode = CurrencyCode.fromAlphabeticCode(currency).getNumericCode();
        } catch (IllegalArgumentException e) {
            currencyCode = "000";
        }
        if (request.getCurrencyCode() != null) {
            currencyCode = request.getCurrencyCode();
        }

        String balanceAccountCode = request.getType().getBalanceCode();
        BigDecimal initialBalance = request.getBalance() != null ? request.getBalance() : BigDecimal.ZERO;
        AccountScope scope = request.getScope() != null ? request.getScope() : AccountScope.PERSONAL;

        Account account = Account.builder()
                .name(request.getName())
                .type(request.getType())
                .currency(currency)
                .balance(initialBalance)
                .openingBalance(request.getOpeningBalance() != null ? request.getOpeningBalance() : initialBalance)
                .color(request.getColor())
                .icon(request.getIcon())
                .balanceAccountCode(balanceAccountCode)
                .currencyCode(currencyCode)
                .description(request.getDescription())
                .bankName(request.getBankName())
                .bankMfo(request.getBankMfo())
                .bankInn(request.getBankInn())
                .scope(scope)
                .familyGroup(currentUser.getUser().getFamilyGroup())
                .build();

        // Owner ni bog'lash
        if (request.getOwnerId() != null) {
            FamilyMember owner = familyMemberRepository.findById(request.getOwnerId())
                    .orElseThrow(() -> new ResourceNotFoundException("Oila a'zosi topilmadi: " + request.getOwnerId()));
            account.setOwner(owner);
        }

        // Avval saqlash (ID olish uchun)
        account = accountRepository.save(account);

        // acc_code generatsiya qilish
        String accCode = generateAccCode(account, balanceAccountCode, currencyCode);
        account.setAccCode(accCode);
        account = accountRepository.save(account);

        // OWNER access yaratish
        accountAccessService.createOwnerAccess(account, currentUser.getUser());

        log.info("Yangi hisob yaratildi: {} (acc_code: {}, scope: {})", account.getName(), accCode, scope);
        return toResponseWithAccessRole(account, currentUser.getId());
    }

    @Transactional
    public AccountResponse update(Long id, AccountRequest request, CustomUserDetails currentUser) {
        Account account = findById(id);
        checkWriteAccess(account, currentUser);

        account.setName(request.getName());
        account.setType(request.getType());
        account.setCurrency(request.getCurrency() != null ? request.getCurrency() : "UZS");
        account.setColor(request.getColor());
        account.setIcon(request.getIcon());
        account.setDescription(request.getDescription());
        account.setBankName(request.getBankName());
        account.setBankMfo(request.getBankMfo());
        account.setBankInn(request.getBankInn());

        if (request.getScope() != null) {
            account.setScope(request.getScope());
        }

        if (request.getOwnerId() != null) {
            FamilyMember owner = familyMemberRepository.findById(request.getOwnerId())
                    .orElseThrow(() -> new ResourceNotFoundException("Oila a'zosi topilmadi: " + request.getOwnerId()));
            account.setOwner(owner);
        }

        return toResponseWithAccessRole(accountRepository.save(account), currentUser.getId());
    }

    @Transactional(readOnly = true)
    public Page<AccountResponse> getMyAccounts(Long userId, Pageable pageable) {
        return accountRepository.findMyAccountsWithScope(userId, pageable)
                .map(a -> toResponseWithAccessRole(a, userId));
    }

    @Transactional
    public AccountResponse changeStatus(Long id, AccountStatus newStatus, CustomUserDetails currentUser) {
        Account account = findById(id);
        checkOwnerAccess(account, currentUser);

        AccountStatus currentStatus = account.getStatus();
        if (currentStatus == AccountStatus.CLOSED) {
            throw new BadRequestException("Yopilgan hisobning holatini o'zgartirib bo'lmaydi");
        }
        if (currentStatus == newStatus) {
            throw new BadRequestException("Hisob allaqachon " + newStatus + " holatida");
        }

        account.setStatus(newStatus);
        if (newStatus == AccountStatus.CLOSED) {
            account.setIsActive(false);
        }

        log.info("Hisob holati o'zgartirildi: {} -> {} (ID: {})", currentStatus, newStatus, id);
        return toResponseWithAccessRole(accountRepository.save(account), currentUser.getId());
    }

    @Transactional(readOnly = true)
    public AccountBalanceSummaryResponse getBalanceSummary(Long id, LocalDate dateFrom, LocalDate dateTo,
            CustomUserDetails currentUser) {
        Account account = findById(id);
        checkAccess(account, currentUser);

        LocalDateTime from = dateFrom != null ? dateFrom.atStartOfDay() : null;
        LocalDateTime to = dateTo != null ? dateTo.atTime(23, 59, 59) : null;

        BigDecimal debitTurnover = transactionRepository.sumDebitTurnover(id, from, to);
        BigDecimal creditTurnover = transactionRepository.sumCreditTurnover(id, from, to);
        BigDecimal openingBal = account.getOpeningBalance() != null ? account.getOpeningBalance() : BigDecimal.ZERO;
        BigDecimal closingBalance = openingBal.add(debitTurnover).subtract(creditTurnover);

        return AccountBalanceSummaryResponse.builder()
                .accountId(account.getId())
                .accCode(account.getAccCode())
                .accountName(account.getName())
                .accountType(account.getType())
                .openingBalance(openingBal)
                .debitTurnover(debitTurnover)
                .creditTurnover(creditTurnover)
                .closingBalance(closingBalance)
                .periodStart(dateFrom)
                .periodEnd(dateTo)
                .build();
    }

    @Transactional
    public void delete(Long id) {
        Account account = findById(id);
        account.setIsActive(false);
        accountRepository.save(account);
    }

    public Account findById(Long id) {
        return accountRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Hisob topilmadi: " + id));
    }

    @Transactional(readOnly = true)
    public Account findTransitAccount(String currency, boolean isIncome) {
        String prefix = isIncome ? "Tizim: Daromad tranziti" : "Tizim: Xarajat tranziti";
        return accountRepository.findByTypeAndCurrencyAndIsActiveTrue(AccountType.SYSTEM_TRANSIT, currency)
                .stream()
                .filter(a -> a.getName().startsWith(prefix))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Tranzit hisob topilmadi: " + prefix + " (" + currency + ")"));
    }

    // -----------------------------------------------------------------------
    // Access check helpers
    // -----------------------------------------------------------------------

    private void checkAccess(Account account, CustomUserDetails currentUser) {
        if (currentUser.isAdmin())
            return;
        if (account.getScope() == AccountScope.FAMILY)
            return;
        if (!accountRepository.canUserAccessAccount(account.getId(), currentUser.getId(), false)) {
            throw new AccessDeniedException("Bu hisobga kirish huquqingiz yo'q");
        }
    }

    private void checkWriteAccess(Account account, CustomUserDetails currentUser) {
        if (currentUser.isAdmin())
            return;
        AccountAccessRole role = accountAccessRepository
                .findRoleByAccountIdAndUserId(account.getId(), currentUser.getId())
                .orElseThrow(() -> new AccessDeniedException("Bu hisobga kirish huquqingiz yo'q"));
        if (role == AccountAccessRole.VIEWER) {
            throw new AccessDeniedException("Bu hisobni tahrirlash huquqingiz yo'q");
        }
    }

    private void checkOwnerAccess(Account account, CustomUserDetails currentUser) {
        if (currentUser.isAdmin())
            return;
        AccountAccessRole role = accountAccessRepository
                .findRoleByAccountIdAndUserId(account.getId(), currentUser.getId())
                .orElseThrow(() -> new AccessDeniedException("Bu hisobga kirish huquqingiz yo'q"));
        if (role != AccountAccessRole.OWNER) {
            throw new AccessDeniedException("Bu amalni faqat hisob egasi bajara oladi");
        }
    }

    // -----------------------------------------------------------------------
    // Response mapping
    // -----------------------------------------------------------------------

    private String resolveAccessRole(Account account, Long userId) {
        if (account.getScope() == AccountScope.FAMILY) {
            return accountAccessRepository.findRoleByAccountIdAndUserId(account.getId(), userId)
                    .map(Enum::name)
                    .orElse("FAMILY_MEMBER");
        }
        return accountAccessRepository.findRoleByAccountIdAndUserId(account.getId(), userId)
                .map(Enum::name)
                .orElse(null);
    }

    private AccountResponse toResponseWithAccessRole(Account a, Long userId) {
        AccountResponse r = toResponse(a);
        r.setMyAccessRole(resolveAccessRole(a, userId));
        return r;
    }

    private AccountResponse toDetailedResponseWithAccessRole(Account a, Long userId) {
        AccountResponse r = toDetailedResponse(a);
        r.setMyAccessRole(resolveAccessRole(a, userId));
        return r;
    }

    private String generateAccCode(Account account, String balanceAccountCode, String currencyCode) {
        long familyId = 0;
        int memberId = 0;

        if (account.getOwner() != null) {
            familyId = account.getOwner().getId();
            memberId = (int) (account.getOwner().getId() % 100);
        }

        long ownerId = account.getOwner() != null ? account.getOwner().getId() : 0;
        long count = accountRepository.countByOwnerAndBalanceCodeAndCurrency(
                ownerId, balanceAccountCode, currencyCode);
        int serialNumber = (int) count;
        if (serialNumber < 1)
            serialNumber = 1;

        return AccCodeGenerator.generate(balanceAccountCode, currencyCode, familyId, memberId, serialNumber);
    }

    private AccountResponse toResponse(Account a) {
        AccountResponse r = new AccountResponse();
        r.setId(a.getId());
        r.setName(a.getName());
        r.setType(a.getType());
        r.setCurrency(a.getCurrency());
        r.setBalance(a.getBalance());
        r.setColor(a.getColor());
        r.setIcon(a.getIcon());
        r.setIsActive(a.getIsActive());
        r.setCreatedAt(a.getCreatedAt());
        r.setAccCode(a.getAccCode());
        r.setAccCodeFormatted(a.getAccCode() != null ? AccCodeGenerator.formatForDisplay(a.getAccCode()) : null);
        r.setBalanceAccountCode(a.getBalanceAccountCode());
        r.setCurrencyCode(a.getCurrencyCode());
        r.setDescription(a.getDescription());
        r.setStatus(a.getStatus() != null ? a.getStatus().name() : "ACTIVE");
        r.setScope(a.getScope() != null ? a.getScope().name() : "PERSONAL");
        r.setOpeningBalance(a.getOpeningBalance());
        r.setBankName(a.getBankName());
        r.setBankMfo(a.getBankMfo());
        r.setBankInn(a.getBankInn());
        if (a.getOwner() != null) {
            r.setOwnerId(a.getOwner().getId());
            r.setOwnerName(a.getOwner().getFullName());
        }
        return r;
    }

    private AccountResponse toDetailedResponse(Account a) {
        AccountResponse r = toResponse(a);

        // Kartalar
        if (a.getCards() != null) {
            List<CardResponse> cards = a.getCards().stream()
                    .filter(c -> c.getIsActive())
                    .map(card -> {
                        CardResponse cr = new CardResponse();
                        cr.setId(card.getId());
                        cr.setAccountId(a.getId());
                        cr.setCardType(card.getCardType());
                        cr.setCardBin(card.getCardBin());
                        cr.setCardLastFour(card.getCardLastFour());
                        cr.setMaskedNumber(card.getMaskedNumber());
                        cr.setCardHolderName(card.getCardHolderName());
                        cr.setExpiryDate(card.getExpiryDate());
                        cr.setIsActive(card.getIsActive());
                        cr.setCreatedAt(card.getCreatedAt());
                        return cr;
                    })
                    .collect(Collectors.toList());
            r.setCards(cards);
        } else {
            r.setCards(new ArrayList<>());
        }

        // Access list
        if (a.getAccessList() != null) {
            List<AccountAccessResponse> accessList = a.getAccessList().stream()
                    .map(access -> {
                        AccountAccessResponse ar = new AccountAccessResponse();
                        ar.setId(access.getId());
                        ar.setAccountId(a.getId());
                        ar.setUserId(access.getUser().getId());
                        ar.setUserName(access.getUser().getUsername());
                        ar.setUserFullName(access.getUser().getFullName());
                        ar.setRole(access.getRole());
                        ar.setGrantedAt(access.getGrantedAt());
                        if (access.getGrantedBy() != null) {
                            ar.setGrantedByName(access.getGrantedBy().getFullName());
                        }
                        return ar;
                    })
                    .collect(Collectors.toList());
            r.setAccessList(accessList);
        } else {
            r.setAccessList(new ArrayList<>());
        }

        return r;
    }
}
