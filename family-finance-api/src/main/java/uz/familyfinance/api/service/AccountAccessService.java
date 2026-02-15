package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.dto.request.AccountAccessRequest;
import uz.familyfinance.api.dto.response.AccountAccessResponse;
import uz.familyfinance.api.entity.Account;
import uz.familyfinance.api.entity.AccountAccess;
import uz.familyfinance.api.entity.User;
import uz.familyfinance.api.enums.AccountAccessRole;
import uz.familyfinance.api.exception.BadRequestException;
import uz.familyfinance.api.exception.ResourceNotFoundException;
import uz.familyfinance.api.repository.AccountAccessRepository;
import uz.familyfinance.api.repository.AccountRepository;
import uz.familyfinance.api.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AccountAccessService {

    private final AccountAccessRepository accessRepository;
    private final AccountRepository accountRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<AccountAccessResponse> getAccessList(Long accountId) {
        return accessRepository.findByAccountId(accountId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AccountAccessResponse> getUserAccounts(Long userId) {
        return accessRepository.findByUserId(userId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public AccountAccessResponse grantAccess(Long accountId, AccountAccessRequest request, User grantedBy) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Hisob topilmadi: " + accountId));

        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Foydalanuvchi topilmadi: " + request.getUserId()));

        if (accessRepository.existsByAccountIdAndUserId(accountId, request.getUserId())) {
            throw new BadRequestException("Bu foydalanuvchiga allaqachon huquq berilgan");
        }

        AccountAccess access = AccountAccess.builder()
                .account(account)
                .user(user)
                .role(request.getRole())
                .grantedAt(LocalDateTime.now())
                .grantedBy(grantedBy)
                .build();

        return toResponse(accessRepository.save(access));
    }

    @Transactional
    public AccountAccessResponse updateRole(Long accountId, Long userId, AccountAccessRole newRole) {
        AccountAccess access = accessRepository.findByAccountIdAndUserId(accountId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Huquq topilmadi"));

        if (access.getRole() == AccountAccessRole.OWNER && newRole != AccountAccessRole.OWNER) {
            long ownerCount = accessRepository.findByAccountId(accountId).stream()
                    .filter(a -> a.getRole() == AccountAccessRole.OWNER)
                    .count();
            if (ownerCount <= 1) {
                throw new BadRequestException("Hisobda kamida bitta OWNER bo'lishi shart");
            }
        }

        access.setRole(newRole);
        return toResponse(accessRepository.save(access));
    }

    @Transactional
    public void revokeAccess(Long accountId, Long userId) {
        AccountAccess access = accessRepository.findByAccountIdAndUserId(accountId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Huquq topilmadi"));

        if (access.getRole() == AccountAccessRole.OWNER) {
            long ownerCount = accessRepository.findByAccountId(accountId).stream()
                    .filter(a -> a.getRole() == AccountAccessRole.OWNER)
                    .count();
            if (ownerCount <= 1) {
                throw new BadRequestException("Yagona OWNER huquqini olib tashlab bo'lmaydi");
            }
        }

        accessRepository.delete(access);
    }

    /**
     * Foydalanuvchining hisobga muayyan darajadagi huquqi borligini tekshiradi.
     */
    @Transactional(readOnly = true)
    public boolean hasAccess(Long accountId, Long userId, AccountAccessRole minimumRole) {
        return accessRepository.findByAccountIdAndUserId(accountId, userId)
                .map(access -> hasMinimumRole(access.getRole(), minimumRole))
                .orElse(false);
    }

    /**
     * Foydalanuvchining hisobga OWNER huquqi bilan AccessEntry yaratadi (hisob yaratilganda).
     */
    @Transactional
    public void createOwnerAccess(Account account, User owner) {
        AccountAccess access = AccountAccess.builder()
                .account(account)
                .user(owner)
                .role(AccountAccessRole.OWNER)
                .grantedAt(LocalDateTime.now())
                .build();
        accessRepository.save(access);
    }

    private boolean hasMinimumRole(AccountAccessRole actual, AccountAccessRole minimum) {
        int actualLevel = getRoleLevel(actual);
        int minimumLevel = getRoleLevel(minimum);
        return actualLevel >= minimumLevel;
    }

    private int getRoleLevel(AccountAccessRole role) {
        return switch (role) {
            case OWNER -> 3;
            case CO_OWNER -> 2;
            case VIEWER -> 1;
        };
    }

    private AccountAccessResponse toResponse(AccountAccess access) {
        AccountAccessResponse r = new AccountAccessResponse();
        r.setId(access.getId());
        r.setAccountId(access.getAccount().getId());
        r.setUserId(access.getUser().getId());
        r.setUserName(access.getUser().getUsername());
        r.setUserFullName(access.getUser().getFullName());
        r.setRole(access.getRole());
        r.setGrantedAt(access.getGrantedAt());
        if (access.getGrantedBy() != null) {
            r.setGrantedByName(access.getGrantedBy().getFullName());
        }
        return r;
    }
}
