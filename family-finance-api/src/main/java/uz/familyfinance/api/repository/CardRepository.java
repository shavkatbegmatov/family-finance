package uz.familyfinance.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import uz.familyfinance.api.entity.Card;

import java.util.List;

public interface CardRepository extends JpaRepository<Card, Long> {
    List<Card> findByAccountId(Long accountId);
    List<Card> findByAccountIdAndIsActiveTrue(Long accountId);
}
