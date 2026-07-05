package uz.familyfinance.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import uz.familyfinance.api.entity.PointShopItem;

import java.util.List;

public interface PointShopItemRepository extends JpaRepository<PointShopItem, Long> {

    /** ADR-002 P1b: hamyon konteksti (HOUSEHOLD scope) bo'yicha. */
    List<PointShopItem> findByScopeIdAndIsActiveTrue(Long scopeId);

    List<PointShopItem> findByScopeId(Long scopeId);
}
