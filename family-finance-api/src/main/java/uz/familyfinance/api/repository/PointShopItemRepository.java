package uz.familyfinance.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import uz.familyfinance.api.entity.PointShopItem;

import java.util.List;

public interface PointShopItemRepository extends JpaRepository<PointShopItem, Long> {

    List<PointShopItem> findByFamilyGroupIdAndIsActiveTrue(Long familyGroupId);

    List<PointShopItem> findByFamilyGroupId(Long familyGroupId);
}
