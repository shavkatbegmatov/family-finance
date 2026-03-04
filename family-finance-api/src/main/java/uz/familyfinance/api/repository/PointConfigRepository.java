package uz.familyfinance.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import uz.familyfinance.api.entity.PointConfig;

import java.util.Optional;

public interface PointConfigRepository extends JpaRepository<PointConfig, Long> {

    Optional<PointConfig> findByFamilyGroupId(Long familyGroupId);

    boolean existsByFamilyGroupId(Long familyGroupId);
}
