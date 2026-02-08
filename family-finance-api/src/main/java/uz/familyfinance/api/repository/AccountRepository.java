package uz.familyfinance.api.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import uz.familyfinance.api.entity.Account;
import uz.familyfinance.api.enums.AccountType;

import java.math.BigDecimal;
import java.util.List;

public interface AccountRepository extends JpaRepository<Account, Long> {
    List<Account> findByIsActiveTrue();
    Page<Account> findByIsActiveTrue(Pageable pageable);
    List<Account> findByTypeAndIsActiveTrue(AccountType type);

    @Query("SELECT COALESCE(SUM(a.balance), 0) FROM Account a WHERE a.isActive = true")
    BigDecimal getTotalBalance();

    @Query("SELECT a FROM Account a WHERE a.isActive = true AND " +
           "LOWER(a.name) LIKE LOWER(CONCAT('%', :search, '%'))")
    Page<Account> search(String search, Pageable pageable);
}
