package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.entity.Account;
import uz.familyfinance.api.entity.BalanceSnapshot;
import uz.familyfinance.api.enums.AccountType;
import uz.familyfinance.api.repository.AccountRepository;
import uz.familyfinance.api.repository.BalanceSnapshotRepository;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class BalanceSnapshotService {

    private final BalanceSnapshotRepository snapshotRepository;
    private final AccountRepository accountRepository;

    /**
     * Har kuni yarim tunda barcha faol hisoblar uchun balans snapshotini yaratadi.
     * "Zakritiya dnya" (Kun yopish) bank operatsiyasi.
     */
    @Scheduled(cron = "0 0 0 * * *")
    @Transactional
    public void createDailySnapshot() {
        LocalDate today = LocalDate.now();
        List<Account> activeAccounts = accountRepository.findByIsActiveTrueAndTypeNot(AccountType.SYSTEM_TRANSIT);

        int created = 0;
        for (Account account : activeAccounts) {
            if (snapshotRepository.findByAccountIdAndSnapshotDate(account.getId(), today).isEmpty()) {
                BalanceSnapshot snapshot = BalanceSnapshot.builder()
                        .account(account)
                        .snapshotDate(today)
                        .balance(account.getBalance())
                        .build();
                snapshotRepository.save(snapshot);
                created++;
            }
        }

        log.info("Kunlik balans snapshot yaratildi: {} ta hisob", created);
    }

    @Transactional(readOnly = true)
    public List<BalanceSnapshot> getSnapshotHistory(Long accountId, LocalDate from, LocalDate to) {
        return snapshotRepository.findByAccountIdAndSnapshotDateBetweenOrderBySnapshotDateAsc(accountId, from, to);
    }
}
