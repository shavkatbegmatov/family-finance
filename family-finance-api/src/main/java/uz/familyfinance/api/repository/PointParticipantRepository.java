package uz.familyfinance.api.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import uz.familyfinance.api.entity.PointParticipant;

import java.util.List;
import java.util.Optional;

public interface PointParticipantRepository extends JpaRepository<PointParticipant, Long> {

    /** ADR-002 P1b: hamyon konteksti (HOUSEHOLD scope) bo'yicha. */
    List<PointParticipant> findByScopeIdAndIsActiveTrue(Long scopeId);

    Page<PointParticipant> findByScopeId(Long scopeId, Pageable pageable);

    Optional<PointParticipant> findByScopeIdAndFamilyMemberId(Long scopeId, Long familyMemberId);

    /** A'zo bo'yicha (kontekstsiz) birinchi faol ishtirokchi — badge/profil ko'rinishlari uchun. */
    Optional<PointParticipant> findFirstByFamilyMemberIdAndIsActiveTrue(Long familyMemberId);

    boolean existsByScopeIdAndFamilyMemberId(Long scopeId, Long familyMemberId);
}
