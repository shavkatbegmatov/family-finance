package uz.familyfinance.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import uz.familyfinance.api.entity.FamilyRelationship;

import java.util.List;
import java.util.Optional;

public interface FamilyRelationshipRepository extends JpaRepository<FamilyRelationship, Long> {

    List<FamilyRelationship> findByFromMemberId(Long fromMemberId);

    @Query("SELECT r FROM FamilyRelationship r JOIN FETCH r.fromMember JOIN FETCH r.toMember WHERE r.fromMember.id = :fromMemberId")
    List<FamilyRelationship> findByFromMemberIdWithMembers(@Param("fromMemberId") Long fromMemberId);

    Optional<FamilyRelationship> findByFromMemberIdAndToMemberId(Long fromMemberId, Long toMemberId);

    void deleteByFromMemberIdAndToMemberId(Long fromMemberId, Long toMemberId);
}
