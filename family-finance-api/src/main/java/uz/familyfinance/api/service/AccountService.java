package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.dto.request.AccountRequest;
import uz.familyfinance.api.dto.response.AccountResponse;
import uz.familyfinance.api.entity.Account;
import uz.familyfinance.api.exception.ResourceNotFoundException;
import uz.familyfinance.api.repository.AccountRepository;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AccountService {

    private final AccountRepository accountRepository;

    @Transactional(readOnly = true)
    public Page<AccountResponse> getAll(String search, Pageable pageable) {
        if (search != null && !search.isBlank()) {
            return accountRepository.search(search, pageable).map(this::toResponse);
        }
        return accountRepository.findByIsActiveTrue(pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public List<AccountResponse> getAllActive() {
        return accountRepository.findByIsActiveTrue().stream()
                .map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public AccountResponse getById(Long id) {
        return toResponse(findById(id));
    }

    @Transactional(readOnly = true)
    public BigDecimal getTotalBalance() {
        return accountRepository.getTotalBalance();
    }

    @Transactional
    public AccountResponse create(AccountRequest request) {
        Account account = Account.builder()
                .name(request.getName())
                .type(request.getType())
                .currency(request.getCurrency() != null ? request.getCurrency() : "UZS")
                .balance(request.getBalance() != null ? request.getBalance() : BigDecimal.ZERO)
                .color(request.getColor())
                .icon(request.getIcon())
                .build();
        return toResponse(accountRepository.save(account));
    }

    @Transactional
    public AccountResponse update(Long id, AccountRequest request) {
        Account account = findById(id);
        account.setName(request.getName());
        account.setType(request.getType());
        account.setCurrency(request.getCurrency() != null ? request.getCurrency() : "UZS");
        account.setColor(request.getColor());
        account.setIcon(request.getIcon());
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
        return r;
    }
}
