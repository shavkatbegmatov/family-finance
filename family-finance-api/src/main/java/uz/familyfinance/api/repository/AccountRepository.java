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

       /** Faqat berilgan family_group'ning hisoblar yig'indisi (legacy — Dashboard ishlatadi). */
       @Query("SELECT COALESCE(SUM(a.balance), 0) FROM Account a "
            + "WHERE a.isActive = true AND a.familyGroup.id = :familyGroupId")
       BigDecimal getTotalBalanceByFamilyGroup(@Param("familyGroupId") Long familyGroupId);

       /**
        * Aktiv scope'dagi hisoblar balansi yig'indisi (scope-aware, "Umumiy balans" KPI).
        *
        * <p>{@code homeScope.id = :scopeId} filtri SYSTEM_TRANSIT global hisoblarni
        * (scope_id = NULL) avtomatik chiqaradi.</p>
        */
       @Query("SELECT COALESCE(SUM(a.balance), 0) FROM Account a "
            + "WHERE a.isActive = true AND a.type <> 'SYSTEM_TRANSIT' AND a.homeScope.id = :scopeId")
       BigDecimal getTotalBalanceByScopeId(@Param("scopeId") Long scopeId);

       @Query("SELECT a FROM Account a WHERE a.isActive = true AND " +
                     "LOWER(a.name) LIKE LOWER(CONCAT('%', :search, '%'))")
       Page<Account> search(String search, Pageable pageable);

       @Modifying
       @Query("UPDATE Account a SET a.balance = a.balance + :amount WHERE a.id = :id")
       void addToBalance(@Param("id") Long id, @Param("amount") BigDecimal amount);

       long countByOwnerIdAndBalanceAccountCodeAndCurrencyCode(Long ownerId, String balanceAccountCode,
                     String currencyCode);

       long countByFamilyGroupIdAndOwnerIsNullAndBalanceAccountCodeAndCurrencyCode(Long familyGroupId,
                     String balanceAccountCode, String currencyCode);

       long countByFamilyGroupIsNullAndOwnerIsNullAndBalanceAccountCodeAndCurrencyCode(String balanceAccountCode,
                     String currencyCode);

       @Query("SELECT a FROM Account a WHERE a.isActive = true AND a.type <> 'SYSTEM_TRANSIT' AND " +
                     "(CAST(:search AS string) IS NULL OR LOWER(a.name) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%')) OR LOWER(a.accCode) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%'))) AND "
                     +
                     "(:accountType IS NULL OR a.type = :accountType) AND " +
                     "(:status IS NULL OR a.status = :status)")
       Page<Account> findWithFilters(@Param("search") String search,
                     @Param("accountType") AccountType accountType,
                     @Param("status") AccountStatus status,
                     Pageable pageable);

       List<Account> findByStatusAndIsActiveTrue(AccountStatus status);

       // ==========================================================
       // Scope-aware queries (Phase 2 — homeScope/scope_id bo'yicha)
       // ==========================================================

       /**
        * "Barcha hisoblar" tabi — aktiv scope'ga tegishli barcha hisoblar.
        *
        * <p>{@code homeScope.id = :scopeId} aniq tanlangan scope bilan filtrlaydi
        * (SYSTEM_TRANSIT global hisoblar scope_id = NULL bo'lgani uchun chiqib ketadi).</p>
        */
       @Query(value = "SELECT a FROM Account a LEFT JOIN FETCH a.owner WHERE a.isActive = true AND a.type <> 'SYSTEM_TRANSIT' AND a.homeScope.id = :scopeId AND "
                     +
                     "(CAST(:search AS string) IS NULL OR LOWER(a.name) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%')) OR LOWER(a.accCode) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%'))) AND "
                     +
                     "(:accountType IS NULL OR a.type = :accountType) AND " +
                     "(:status IS NULL OR a.status = :status)", countQuery = "SELECT COUNT(a) FROM Account a WHERE a.isActive = true AND a.type <> 'SYSTEM_TRANSIT' AND a.homeScope.id = :scopeId AND "
                                   +
                                   "(CAST(:search AS string) IS NULL OR LOWER(a.name) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%')) OR LOWER(a.accCode) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%'))) AND "
                                   +
                                   "(:accountType IS NULL OR a.type = :accountType) AND " +
                                   "(:status IS NULL OR a.status = :status)")
       Page<Account> findByScopeId(@Param("scopeId") Long scopeId,
                     @Param("search") String search,
                     @Param("accountType") AccountType accountType,
                     @Param("status") AccountStatus status,
                     Pageable pageable);

       /**
        * "Mening hisoblarim" tabi — aktiv scope ichida men bilan bog'liq hisoblar:
        * men owner (FamilyMember.user = me) bo'lgan YOKI menga AccountAccess berilgan.
        */
       @Query("SELECT a FROM Account a LEFT JOIN a.owner o LEFT JOIN o.user ou "
                     +
                     "WHERE a.isActive = true AND a.type <> 'SYSTEM_TRANSIT' AND a.homeScope.id = :scopeId AND "
                     +
                     "(ou.id = :userId OR EXISTS(SELECT 1 FROM AccountAccess aa WHERE aa.account = a AND aa.user.id = :userId))")
       Page<Account> findMyAccountsByScopeId(@Param("scopeId") Long scopeId,
                     @Param("userId") Long userId,
                     Pageable pageable);

       /** Aktiv scope'dagi barcha aktiv hisoblar (/list dropdown uchun). */
       @Query("SELECT a FROM Account a LEFT JOIN FETCH a.owner WHERE a.isActive = true AND a.type <> 'SYSTEM_TRANSIT' AND a.homeScope.id = :scopeId")
       List<Account> findActiveByScopeId(@Param("scopeId") Long scopeId);

       // Access-controlled queries

       @Query("SELECT CASE WHEN COUNT(a) > 0 THEN true ELSE false END FROM Account a WHERE a.id = :accountId AND " +
                     "(:isAdmin = true OR (a.scope = 'FAMILY' AND a.familyGroup.id = (SELECT u.familyGroup.id FROM User u WHERE u.id = :userId)) OR EXISTS(SELECT 1 FROM AccountAccess aa WHERE aa.account = a AND aa.user.id = :userId))")
       boolean canUserAccessAccount(@Param("accountId") Long accountId,
                     @Param("userId") Long userId,
                     @Param("isAdmin") boolean isAdmin);

       @Query("SELECT a FROM Account a LEFT JOIN FETCH a.owner " +
                     "WHERE a.familyGroup.id = :familyGroupId AND a.scope = 'FAMILY' " +
                     "AND a.status = 'ACTIVE' AND a.isActive = true")
       List<Account> findFamilyAccountsByGroupId(@Param("familyGroupId") Long familyGroupId);

       @Query("SELECT a FROM Account a WHERE a.owner.id = :ownerId AND a.isActive = true AND a.type <> 'SYSTEM_TRANSIT'")
       List<Account> findByOwnerId(@Param("ownerId") Long ownerId);
}
