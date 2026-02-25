package uz.familyfinance.api.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import uz.familyfinance.api.entity.Bank;

import java.util.List;

@Repository
public interface BankRepository extends JpaRepository<Bank, Long> {
    Page<Bank> findByNameContainingIgnoreCaseOrShortNameContainingIgnoreCase(String name, String shortName,
            Pageable pageable);

    List<Bank> findByIsActiveTrueOrderByNameAsc();
}
