package uz.familyfinance.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import uz.familyfinance.api.entity.FamilyGroup;

public interface FamilyGroupRepository extends JpaRepository<FamilyGroup, Long> {
}
