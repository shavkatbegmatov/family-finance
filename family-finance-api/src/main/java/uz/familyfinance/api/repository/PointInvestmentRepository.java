package uz.familyfinance.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import uz.familyfinance.api.entity.PointInvestment;

import java.util.List;

public interface PointInvestmentRepository extends JpaRepository<PointInvestment, Long> {

    List<PointInvestment> findByParticipantIdAndIsActiveTrue(Long participantId);

    List<PointInvestment> findByFamilyGroupIdAndIsActiveTrue(Long familyGroupId);

    List<PointInvestment> findByIsActiveTrue();
}
