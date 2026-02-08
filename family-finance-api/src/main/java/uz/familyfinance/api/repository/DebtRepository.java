package uz.familyfinance.api.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import uz.familyfinance.api.entity.Debt;
import uz.familyfinance.api.enums.DebtStatus;
import uz.familyfinance.api.enums.DebtType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface DebtRepository extends JpaRepository<Debt, Long> {
    Page<Debt> findByType(DebtType type, Pageable pageable);
    Page<Debt> findByStatus(DebtStatus status, Pageable pageable);
    List<Debt> findByStatusIn(List<DebtStatus> statuses);

    @Query("SELECT d FROM Debt d WHERE d.status IN ('ACTIVE', 'PARTIALLY_PAID') AND d.dueDate <= :date")
    List<Debt> findOverdueDebts(@Param("date") LocalDate date);

    @Query("SELECT COALESCE(SUM(d.remainingAmount), 0) FROM Debt d WHERE d.type = :type AND d.status != 'PAID'")
    BigDecimal sumRemainingByType(@Param("type") DebtType type);

    @Query("SELECT d FROM Debt d WHERE " +
           "(:type IS NULL OR d.type = :type) AND " +
           "(:status IS NULL OR d.status = :status) AND " +
           "(LOWER(d.personName) LIKE LOWER(CONCAT('%', :search, '%')) OR :search IS NULL)")
    Page<Debt> findWithFilters(@Param("type") DebtType type, @Param("status") DebtStatus status,
                                @Param("search") String search, Pageable pageable);
}
