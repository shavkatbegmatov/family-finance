package uz.familyfinance.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import uz.familyfinance.api.entity.FamilyRelationship;

import java.util.List;
import java.util.Optional;

public interface FamilyRelationshipRepository extends JpaRepository<FamilyRelationship, Long> {

    List<FamilyRelationship> findByFromMemberId(Long fromMemberId);

    Optional<FamilyRelationship> findByFromMemberIdAndToMemberId(Long fromMemberId, Long toMemberId);

    void deleteByFromMemberIdAndToMemberId(Long fromMemberId, Long toMemberId);
}
