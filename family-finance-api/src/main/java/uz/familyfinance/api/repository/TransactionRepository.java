package uz.familyfinance.api.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import uz.familyfinance.api.entity.Transaction;
import uz.familyfinance.api.enums.TransactionType;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    Page<Transaction> findByType(TransactionType type, Pageable pageable);

    @Query(
            value = "SELECT t FROM Transaction t WHERE " +
                    "(:type IS NULL OR t.type = :type) AND " +
                    "(:accountId IS NULL OR t.account.id = :accountId) AND " +
                    "(:categoryId IS NULL OR t.category.id = :categoryId) AND " +
                    "(:memberId IS NULL OR t.familyMember.id = :memberId) AND " +
                    "(CAST(:fromDate AS timestamp) IS NULL OR t.transactionDate >= :fromDate) AND " +
                    "(CAST(:toDate AS timestamp) IS NULL OR t.transactionDate <= :toDate)",
            countQuery = "SELECT COUNT(t) FROM Transaction t WHERE " +
                    "(:type IS NULL OR t.type = :type) AND " +
                    "(:accountId IS NULL OR t.account.id = :accountId) AND " +
                    "(:categoryId IS NULL OR t.category.id = :categoryId) AND " +
                    "(:memberId IS NULL OR t.familyMember.id = :memberId) AND " +
                    "(CAST(:fromDate AS timestamp) IS NULL OR t.transactionDate >= :fromDate) AND " +
                    "(CAST(:toDate AS timestamp) IS NULL OR t.transactionDate <= :toDate)"
    )
    Page<Transaction> findWithFilters(
            @Param("type") TransactionType type,
            @Param("accountId") Long accountId,
            @Param("categoryId") Long categoryId,
            @Param("memberId") Long memberId,
            @Param("fromDate") LocalDateTime from,
            @Param("toDate") LocalDateTime to,
            Pageable pageable);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE t.type = :type AND " +
           "t.transactionDate >= :from AND t.transactionDate <= :to")
    BigDecimal sumByTypeAndDateRange(@Param("type") TransactionType type,
                                      @Param("from") LocalDateTime from,
                                      @Param("to") LocalDateTime to);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE t.type = 'EXPENSE' AND " +
           "t.category.id = :categoryId AND t.transactionDate >= :from AND t.transactionDate <= :to")
    BigDecimal sumExpenseByCategoryAndDateRange(@Param("categoryId") Long categoryId,
                                                 @Param("from") LocalDateTime from,
                                                 @Param("to") LocalDateTime to);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE t.type = 'INCOME' AND " +
           "t.category.id = :categoryId AND t.transactionDate >= :from AND t.transactionDate <= :to")
    BigDecimal sumIncomeByCategoryAndDateRange(@Param("categoryId") Long categoryId,
                                                @Param("from") LocalDateTime from,
                                                @Param("to") LocalDateTime to);

    List<Transaction> findTop10ByOrderByTransactionDateDesc();

    @Query("SELECT t FROM Transaction t WHERE t.isRecurring = true AND t.recurringPattern IS NOT NULL")
    List<Transaction> findRecurringTransactions();

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE t.type = 'EXPENSE' AND " +
           "t.familyMember.id = :memberId AND t.transactionDate >= :from AND t.transactionDate <= :to")
    BigDecimal sumExpenseByMemberAndDateRange(@Param("memberId") Long memberId,
                                               @Param("from") LocalDateTime from,
                                               @Param("to") LocalDateTime to);
}
