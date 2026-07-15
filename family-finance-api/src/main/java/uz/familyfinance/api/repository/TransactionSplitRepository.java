package uz.familyfinance.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import uz.familyfinance.api.entity.TransactionSplit;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public interface TransactionSplitRepository extends JpaRepository<TransactionSplit, Long> {

    List<TransactionSplit> findByTransactionId(Long transactionId);

    @Modifying
    @Query("DELETE FROM TransactionSplit s WHERE s.transaction.id = :transactionId")
    void deleteByTransactionId(@Param("transactionId") Long transactionId);

    /**
     * Kategoriya hisobotida split'lar ham hisobga olinishi uchun. Storno qilingan
     * tranzaksiya (status=REVERSED) split'lari chiqarib tashlanadi — aks holda
     * storno'dan keyin ham byudjet "spent"'ga qo'shilib qolardi.
     */
    @Query("SELECT COALESCE(SUM(s.amount), 0) FROM TransactionSplit s " +
            "WHERE s.category.id = :categoryId " +
            "AND s.transaction.type = 'EXPENSE' " +
            "AND s.transaction.status <> 'REVERSED' " +
            "AND s.transaction.transactionDate >= :from " +
            "AND s.transaction.transactionDate <= :to")
    BigDecimal sumExpenseByCategoryAndDateRange(@Param("categoryId") Long categoryId,
                                                 @Param("from") LocalDateTime from,
                                                 @Param("to") LocalDateTime to);

    /** C3: Scope-aware split xarajati — faqat berilgan scope'dagi (transaction.account.homeScope). */
    @Query("SELECT COALESCE(SUM(s.amount), 0) FROM TransactionSplit s " +
            "WHERE s.category.id = :categoryId " +
            "AND s.transaction.account.homeScope.id = :scopeId " +
            "AND s.transaction.type = 'EXPENSE' " +
            "AND s.transaction.status <> 'REVERSED' " +
            "AND s.transaction.transactionDate >= :from " +
            "AND s.transaction.transactionDate <= :to")
    BigDecimal sumExpenseByCategoryAndScopeAndDateRange(@Param("categoryId") Long categoryId,
                                                        @Param("scopeId") Long scopeId,
                                                        @Param("from") LocalDateTime from,
                                                        @Param("to") LocalDateTime to);
}
