package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.dto.request.AccountRequest;
import uz.familyfinance.api.dto.response.AccountAccessResponse;
import uz.familyfinance.api.dto.response.AccountResponse;
import uz.familyfinance.api.dto.response.CardResponse;
import uz.familyfinance.api.entity.Account;
import uz.familyfinance.api.entity.FamilyMember;
import uz.familyfinance.api.enums.AccountType;
import uz.familyfinance.api.enums.CurrencyCode;
import uz.familyfinance.api.exception.ResourceNotFoundException;
import uz.familyfinance.api.repository.AccountRepository;
import uz.familyfinance.api.repository.FamilyMemberRepository;
import uz.familyfinance.api.util.AccCodeGenerator;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AccountService {

    private final AccountRepository accountRepository;
    private final FamilyMemberRepository familyMemberRepository;

    @Transactional(readOnly = true)
    public Page<AccountResponse> getAll(String search, Pageable pageable) {
        if (search != null && !search.isBlank()) {
            return accountRepository.search(search, pageable).map(this::toResponse);
        }
        // SYSTEM_TRANSIT hisoblarini filtrlash
        return accountRepository.findByIsActiveTrueAndTypeNot(AccountType.SYSTEM_TRANSIT, pageable)
                .map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public List<AccountResponse> getAllActive() {
        return accountRepository.findByIsActiveTrueAndTypeNot(AccountType.SYSTEM_TRANSIT).stream()
                .map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public AccountResponse getById(Long id) {
        return toDetailedResponse(findById(id));
    }

    @Transactional(readOnly = true)
    public AccountResponse getByAccCode(String accCode) {
        Account account = accountRepository.findByAccCode(accCode)
                .orElseThrow(() -> new ResourceNotFoundException("Hisob topilmadi: " + accCode));
        return toDetailedResponse(account);
    }

    @Transactional(readOnly = true)
    public BigDecimal getTotalBalance() {
        return accountRepository.getTotalBalance();
    }

    @Transactional
    public AccountResponse create(AccountRequest request) {
        // Valyuta kodini aniqlash
        String currency = request.getCurrency() != null ? request.getCurrency() : "UZS";
        String currencyCode;
        try {
            currencyCode = CurrencyCode.fromAlphabeticCode(currency).getNumericCode();
        } catch (IllegalArgumentException e) {
            currencyCode = "000"; // default UZS
        }
        if (request.getCurrencyCode() != null) {
            currencyCode = request.getCurrencyCode();
        }

        // Balans hisob kodini AccountType dan olish
        String balanceAccountCode = request.getType().getBalanceCode();

        Account account = Account.builder()
                .name(request.getName())
                .type(request.getType())
                .currency(currency)
                .balance(request.getBalance() != null ? request.getBalance() : BigDecimal.ZERO)
                .color(request.getColor())
                .icon(request.getIcon())
                .balanceAccountCode(balanceAccountCode)
                .currencyCode(currencyCode)
                .description(request.getDescription())
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

        log.info("Yangi hisob yaratildi: {} (acc_code: {})", account.getName(), accCode);
        return toResponse(account);
    }

    @Transactional
    public AccountResponse update(Long id, AccountRequest request) {
        Account account = findById(id);
        account.setName(request.getName());
        account.setType(request.getType());
        account.setCurrency(request.getCurrency() != null ? request.getCurrency() : "UZS");
        account.setColor(request.getColor());
        account.setIcon(request.getIcon());
        account.setDescription(request.getDescription());

        if (request.getOwnerId() != null) {
            FamilyMember owner = familyMemberRepository.findById(request.getOwnerId())
                    .orElseThrow(() -> new ResourceNotFoundException("Oila a'zosi topilmadi: " + request.getOwnerId()));
            account.setOwner(owner);
        }

        return toResponse(accountRepository.save(account));
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

    /**
     * Berilgan valyuta va tur bo'yicha tranzit hisobni topadi.
     */
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

    private String generateAccCode(Account account, String balanceAccountCode, String currencyCode) {
        // FamilyId ni aniqlash
        long familyId = 0;
        int memberId = 0;

        if (account.getOwner() != null) {
            familyId = account.getOwner().getId();
            memberId = (int) (account.getOwner().getId() % 100);
        }

        // Tartib raqamini aniqlash (shu turdagi hisoblar soni + 1)
        long ownerId = account.getOwner() != null ? account.getOwner().getId() : 0;
        long count = accountRepository.countByOwnerAndBalanceCodeAndCurrency(
                ownerId, balanceAccountCode, currencyCode);
        int serialNumber = (int) count; // Hozirgi hisob o'zi ham hisobga kiritilgan

        if (serialNumber < 1) serialNumber = 1;

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
        if (a.getOwner() != null) {
            r.setOwnerId(a.getOwner().getId());
            r.setOwnerName(a.getOwner().getFullName());
        }
        return r;
    }

    /**
     * Batafsil response: kartalar va access list bilan.
     */
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
