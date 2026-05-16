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

    /** Kategoriya hisobotida split'lar ham hisobga olinishi uchun. */
    @Query("SELECT COALESCE(SUM(s.amount), 0) FROM TransactionSplit s " +
            "WHERE s.category.id = :categoryId " +
            "AND s.transaction.type = 'EXPENSE' " +
            "AND s.transaction.transactionDate >= :from " +
            "AND s.transaction.transactionDate <= :to")
    BigDecimal sumExpenseByCategoryAndDateRange(@Param("categoryId") Long categoryId,
                                                 @Param("from") LocalDateTime from,
                                                 @Param("to") LocalDateTime to);
}
