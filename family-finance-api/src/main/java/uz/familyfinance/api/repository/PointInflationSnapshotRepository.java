package uz.familyfinance.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import uz.familyfinance.api.entity.PointInflationSnapshot;

import java.util.List;

public interface PointInflationSnapshotRepository extends JpaRepository<PointInflationSnapshot, Long> {

    List<PointInflationSnapshot> findByFamilyGroupIdOrderBySnapshotDateDesc(Long familyGroupId);
}
