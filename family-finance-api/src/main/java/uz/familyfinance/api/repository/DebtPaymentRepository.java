package uz.familyfinance.api.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import uz.familyfinance.api.entity.DebtPayment;

import java.util.List;

public interface DebtPaymentRepository extends JpaRepository<DebtPayment, Long> {
    List<DebtPayment> findByDebtIdOrderByPaymentDateDesc(Long debtId);
    Page<DebtPayment> findByDebtId(Long debtId, Pageable pageable);
}
