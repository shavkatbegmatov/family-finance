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
                    "(:status IS NULL OR t.status = :status) AND " +
                    "(CAST(:fromDate AS timestamp) IS NULL OR t.transactionDate >= :fromDate) AND " +
                    "(CAST(:toDate AS timestamp) IS NULL OR t.transactionDate <= :toDate)",
            countQuery = "SELECT COUNT(t) FROM Transaction t WHERE " +
                    "(:type IS NULL OR t.type = :type) AND " +
                    "(:accountId IS NULL OR t.account.id = :accountId) AND " +
                    "(:categoryId IS NULL OR t.category.id = :categoryId) AND " +
                    "(:memberId IS NULL OR t.familyMember.id = :memberId) AND " +
                    "(:status IS NULL OR t.status = :status) AND " +
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
            @Param("status") String status,
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

    List<Transaction> findByOriginalTransactionId(Long originalTransactionId);

    // Dashboard batch aggregate queries

    @Query("SELECT t.type, extract(month from t.transactionDate), COALESCE(SUM(t.amount), 0) " +
           "FROM Transaction t WHERE t.transactionDate >= :from AND t.transactionDate <= :to " +
           "GROUP BY t.type, extract(month from t.transactionDate)")
    List<Object[]> sumByTypeGroupedByMonth(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query("SELECT t.category.id, COALESCE(SUM(t.amount), 0) FROM Transaction t " +
           "WHERE t.type = 'EXPENSE' AND t.transactionDate >= :from AND t.transactionDate <= :to " +
           "GROUP BY t.category.id")
    List<Object[]> sumExpenseGroupedByCategory(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query("SELECT t.category.id, COALESCE(SUM(t.amount), 0) FROM Transaction t " +
           "WHERE t.type = 'INCOME' AND t.transactionDate >= :from AND t.transactionDate <= :to " +
           "GROUP BY t.category.id")
    List<Object[]> sumIncomeGroupedByCategory(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query("SELECT t.category.id, COALESCE(SUM(t.amount), 0) FROM Transaction t " +
           "WHERE t.type = 'EXPENSE' AND t.category.id IN :categoryIds " +
           "AND t.transactionDate >= :from AND t.transactionDate <= :to " +
           "GROUP BY t.category.id")
    List<Object[]> sumExpenseByCategoryIds(@Param("categoryIds") List<Long> categoryIds,
                                            @Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query("SELECT t FROM Transaction t WHERE " +
           "(t.debitAccount.id = :accountId OR t.creditAccount.id = :accountId OR t.account.id = :accountId) " +
           "ORDER BY t.transactionDate DESC")
    Page<Transaction> findByAccountId(@Param("accountId") Long accountId, Pageable pageable);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE t.debitAccount.id = :accountId " +
           "AND t.status = 'CONFIRMED' " +
           "AND (CAST(:fromDate AS timestamp) IS NULL OR t.transactionDate >= :fromDate) " +
           "AND (CAST(:toDate AS timestamp) IS NULL OR t.transactionDate <= :toDate)")
    BigDecimal sumDebitTurnover(@Param("accountId") Long accountId,
                                @Param("fromDate") LocalDateTime fromDate,
                                @Param("toDate") LocalDateTime toDate);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE t.creditAccount.id = :accountId " +
           "AND t.status = 'CONFIRMED' " +
           "AND (CAST(:fromDate AS timestamp) IS NULL OR t.transactionDate >= :fromDate) " +
           "AND (CAST(:toDate AS timestamp) IS NULL OR t.transactionDate <= :toDate)")
    BigDecimal sumCreditTurnover(@Param("accountId") Long accountId,
                                  @Param("fromDate") LocalDateTime fromDate,
                                  @Param("toDate") LocalDateTime toDate);

    @Query("SELECT t.familyMember.id, t.type, COALESCE(SUM(t.amount), 0) " +
           "FROM Transaction t " +
           "WHERE t.familyMember.id IN :memberIds " +
           "AND t.transactionDate >= :from AND t.transactionDate <= :to " +
           "GROUP BY t.familyMember.id, t.type")
    List<Object[]> sumByMemberIdsGroupedByType(@Param("memberIds") List<Long> memberIds,
                                                @Param("from") LocalDateTime from,
                                                @Param("to") LocalDateTime to);
}
