package uz.familyfinance.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import uz.familyfinance.api.entity.FamilyChild;
import uz.familyfinance.api.enums.LineageType;

import java.util.List;
import java.util.Optional;

public interface FamilyChildRepository extends JpaRepository<FamilyChild, Long> {

    List<FamilyChild> findByFamilyUnitId(Long familyUnitId);

    List<FamilyChild> findByPersonId(Long personId);

    Optional<FamilyChild> findByFamilyUnitIdAndPersonId(Long familyUnitId, Long personId);

    Optional<FamilyChild> findByPersonIdAndLineageType(Long personId, LineageType lineageType);
}
