package uz.familyfinance.api.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import uz.familyfinance.api.entity.PointPurchase;

import java.util.List;

public interface PointPurchaseRepository extends JpaRepository<PointPurchase, Long> {

    Page<PointPurchase> findByParticipantIdOrderByPurchaseDateDesc(Long participantId, Pageable pageable);

    List<PointPurchase> findByFamilyGroupIdAndIsDeliveredFalse(Long familyGroupId);
}
