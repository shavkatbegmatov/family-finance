package uz.familyfinance.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import uz.familyfinance.api.entity.BankBin;

import java.util.Optional;

@Repository
public interface BankBinRepository extends JpaRepository<BankBin, Long> {

    @Query(value = "SELECT * FROM bank_bins WHERE :cardNumber LIKE CONCAT(bin_prefix, '%') ORDER BY LENGTH(bin_prefix) DESC LIMIT 1", nativeQuery = true)
    Optional<BankBin> findBestMatchForCardNumber(String cardNumber);

    boolean existsByBinPrefix(String binPrefix);

    void deleteByBankId(Long bankId);
}
