package uz.familyfinance.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import uz.familyfinance.api.entity.PurchaseReturnItem;

import java.util.List;

@Repository
public interface PurchaseReturnItemRepository extends JpaRepository<PurchaseReturnItem, Long> {

    List<PurchaseReturnItem> findByPurchaseReturnId(Long purchaseReturnId);
}
