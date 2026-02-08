package uz.familyfinance.api.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.entity.Account;
import uz.familyfinance.api.entity.FamilyMember;
import uz.familyfinance.api.enums.AccountType;
import uz.familyfinance.api.enums.FamilyRole;
import uz.familyfinance.api.repository.AccountRepository;
import uz.familyfinance.api.repository.FamilyMemberRepository;

import java.math.BigDecimal;

@Component
@Profile("dev")
@RequiredArgsConstructor
@Slf4j
public class TestDataInitializer implements CommandLineRunner {

    private final FamilyMemberRepository familyMemberRepository;
    private final AccountRepository accountRepository;

    @Override
    @Transactional
    public void run(String... args) {
        if (familyMemberRepository.count() == 0) {
            setupTestData();
        }
    }

    private void setupTestData() {
        log.info("Creating test family members and accounts...");

        familyMemberRepository.save(FamilyMember.builder()
                .fullName("Otabek (Ota)")
                .role(FamilyRole.FATHER)
                .phone("+998901234567")
                .build());

        familyMemberRepository.save(FamilyMember.builder()
                .fullName("Nilufar (Ona)")
                .role(FamilyRole.MOTHER)
                .phone("+998901234568")
                .build());

        familyMemberRepository.save(FamilyMember.builder()
                .fullName("Jasur (Farzand)")
                .role(FamilyRole.CHILD)
                .build());

        accountRepository.save(Account.builder()
                .name("Asosiy hamyon")
                .type(AccountType.CASH)
                .balance(BigDecimal.valueOf(500000))
                .color("#22c55e")
                .icon("Wallet")
                .build());

        accountRepository.save(Account.builder()
                .name("Humo karta")
                .type(AccountType.BANK_CARD)
                .balance(BigDecimal.valueOf(2500000))
                .color("#3b82f6")
                .icon("CreditCard")
                .build());

        accountRepository.save(Account.builder()
                .name("Jamg'arma")
                .type(AccountType.SAVINGS)
                .balance(BigDecimal.valueOf(10000000))
                .color("#f59e0b")
                .icon("PiggyBank")
                .build());

        log.info("Test data created successfully");
    }
}
