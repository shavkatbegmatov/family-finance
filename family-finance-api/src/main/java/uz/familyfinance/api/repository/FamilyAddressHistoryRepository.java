package uz.familyfinance.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import uz.familyfinance.api.entity.FamilyAddressHistory;

import java.util.List;

public interface FamilyAddressHistoryRepository extends JpaRepository<FamilyAddressHistory, Long> {

    List<FamilyAddressHistory> findByFamilyGroupIdOrderByMoveInDateDesc(Long familyGroupId);

    List<FamilyAddressHistory> findByFamilyGroupIdOrderByMoveInDateAsc(Long familyGroupId);

    @Modifying
    @Query("UPDATE FamilyAddressHistory h SET h.isCurrent = false, h.moveOutDate = CURRENT_DATE WHERE h.familyGroup.id = :familyGroupId AND h.isCurrent = true")
    void markCurrentAsPast(@Param("familyGroupId") Long familyGroupId);
}
