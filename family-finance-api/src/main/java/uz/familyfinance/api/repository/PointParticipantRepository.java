package uz.familyfinance.api.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import uz.familyfinance.api.entity.PointParticipant;

import java.util.List;
import java.util.Optional;

public interface PointParticipantRepository extends JpaRepository<PointParticipant, Long> {

    List<PointParticipant> findByFamilyGroupIdAndIsActiveTrue(Long familyGroupId);

    Page<PointParticipant> findByFamilyGroupId(Long familyGroupId, Pageable pageable);

    Optional<PointParticipant> findByFamilyGroupIdAndFamilyMemberId(Long familyGroupId, Long familyMemberId);

    boolean existsByFamilyGroupIdAndFamilyMemberId(Long familyGroupId, Long familyMemberId);
}
