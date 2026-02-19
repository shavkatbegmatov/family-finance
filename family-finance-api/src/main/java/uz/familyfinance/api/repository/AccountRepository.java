package uz.familyfinance.api.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import uz.familyfinance.api.entity.Account;
import uz.familyfinance.api.enums.AccountStatus;
import uz.familyfinance.api.enums.AccountType;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface AccountRepository extends JpaRepository<Account, Long> {
    List<Account> findByIsActiveTrue();
    Page<Account> findByIsActiveTrue(Pageable pageable);
    List<Account> findByTypeAndIsActiveTrue(AccountType type);

    Optional<Account> findByAccCode(String accCode);

    Page<Account> findByIsActiveTrueAndTypeNot(AccountType type, Pageable pageable);
    List<Account> findByIsActiveTrueAndTypeNot(AccountType type);

    List<Account> findByTypeAndCurrencyAndIsActiveTrue(AccountType type, String currency);

    @Query("SELECT COALESCE(SUM(a.balance), 0) FROM Account a WHERE a.isActive = true")
    BigDecimal getTotalBalance();

    @Query("SELECT a FROM Account a WHERE a.isActive = true AND " +
           "LOWER(a.name) LIKE LOWER(CONCAT('%', :search, '%'))")
    Page<Account> search(String search, Pageable pageable);

    @Modifying
    @Query("UPDATE Account a SET a.balance = a.balance + :amount WHERE a.id = :id")
    void addToBalance(@Param("id") Long id, @Param("amount") BigDecimal amount);

    @Query("SELECT COUNT(a) FROM Account a WHERE a.owner.id = :ownerId AND a.balanceAccountCode = :balanceCode AND a.currencyCode = :currencyCode")
    long countByOwnerAndBalanceCodeAndCurrency(@Param("ownerId") Long ownerId, @Param("balanceCode") String balanceCode, @Param("currencyCode") String currencyCode);

    @Query("SELECT a FROM Account a WHERE a.isActive = true AND a.type <> 'SYSTEM_TRANSIT' AND " +
           "(CAST(:search AS string) IS NULL OR LOWER(a.name) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%')) OR LOWER(a.accCode) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%'))) AND " +
           "(:accountType IS NULL OR a.type = :accountType) AND " +
           "(:status IS NULL OR a.status = :status)")
    Page<Account> findWithFilters(@Param("search") String search,
                                   @Param("accountType") AccountType accountType,
                                   @Param("status") AccountStatus status,
                                   Pageable pageable);

    @Query("SELECT a FROM Account a JOIN a.accessList al WHERE al.user.id = :userId AND a.isActive = true AND a.type <> 'SYSTEM_TRANSIT'")
    Page<Account> findMyAccounts(@Param("userId") Long userId, Pageable pageable);

    List<Account> findByStatusAndIsActiveTrue(AccountStatus status);
}
