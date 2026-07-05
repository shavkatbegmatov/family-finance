package uz.familyfinance.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import uz.familyfinance.api.entity.PointConfig;

import java.util.Optional;

public interface PointConfigRepository extends JpaRepository<PointConfig, Long> {

    /** ADR-002 P1b: hamyon konteksti (HOUSEHOLD scope) bo'yicha — V56 backfill'dan keyin yagona kalit. */
    Optional<PointConfig> findByScopeId(Long scopeId);

    boolean existsByScopeId(Long scopeId);
}
