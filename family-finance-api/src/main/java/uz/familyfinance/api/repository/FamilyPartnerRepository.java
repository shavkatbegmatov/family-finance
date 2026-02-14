package uz.familyfinance.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import uz.familyfinance.api.entity.FamilyPartner;

import java.util.List;
import java.util.Optional;

public interface FamilyPartnerRepository extends JpaRepository<FamilyPartner, Long> {

    List<FamilyPartner> findByFamilyUnitId(Long familyUnitId);

    List<FamilyPartner> findByPersonId(Long personId);

    Optional<FamilyPartner> findByFamilyUnitIdAndPersonId(Long familyUnitId, Long personId);

    long countByFamilyUnitId(Long familyUnitId);
}
