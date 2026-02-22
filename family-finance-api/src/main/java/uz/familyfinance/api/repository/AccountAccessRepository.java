package uz.familyfinance.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import uz.familyfinance.api.entity.AccountAccess;
import uz.familyfinance.api.enums.AccountAccessRole;

import java.util.List;
import java.util.Optional;

public interface AccountAccessRepository extends JpaRepository<AccountAccess, Long> {
    List<AccountAccess> findByAccountId(Long accountId);
    List<AccountAccess> findByUserId(Long userId);
    Optional<AccountAccess> findByAccountIdAndUserId(Long accountId, Long userId);

    @Query("SELECT aa FROM AccountAccess aa WHERE aa.user.id = :userId AND aa.role = :role")
    List<AccountAccess> findByUserIdAndRole(@Param("userId") Long userId, @Param("role") AccountAccessRole role);

    @Query("SELECT aa FROM AccountAccess aa WHERE aa.user.id = :userId AND aa.role IN :roles")
    List<AccountAccess> findByUserIdAndRoleIn(@Param("userId") Long userId, @Param("roles") List<AccountAccessRole> roles);

    boolean existsByAccountIdAndUserId(Long accountId, Long userId);

    void deleteByAccountIdAndUserId(Long accountId, Long userId);

    @Query("SELECT aa.role FROM AccountAccess aa WHERE aa.account.id = :accountId AND aa.user.id = :userId")
    Optional<AccountAccessRole> findRoleByAccountIdAndUserId(@Param("accountId") Long accountId, @Param("userId") Long userId);

    @Query("SELECT aa FROM AccountAccess aa WHERE aa.account.id IN :accountIds AND aa.user.id = :userId")
    List<AccountAccess> findByAccountIdsAndUserId(@Param("accountIds") List<Long> accountIds, @Param("userId") Long userId);
}
