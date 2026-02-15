package uz.familyfinance.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import uz.familyfinance.api.entity.BalanceSnapshot;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface BalanceSnapshotRepository extends JpaRepository<BalanceSnapshot, Long> {
    Optional<BalanceSnapshot> findByAccountIdAndSnapshotDate(Long accountId, LocalDate snapshotDate);
    List<BalanceSnapshot> findByAccountIdAndSnapshotDateBetweenOrderBySnapshotDateAsc(
            Long accountId, LocalDate from, LocalDate to);
    List<BalanceSnapshot> findByAccountIdOrderBySnapshotDateDesc(Long accountId);
}
