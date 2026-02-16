package uz.familyfinance.api.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import uz.familyfinance.api.entity.FamilyMember;
import uz.familyfinance.api.enums.Gender;

import java.util.List;
import java.util.Optional;

public interface FamilyMemberRepository extends JpaRepository<FamilyMember, Long> {
    Page<FamilyMember> findByIsActiveTrue(Pageable pageable);
    List<FamilyMember> findByIsActiveTrue();
    Optional<FamilyMember> findByUserId(Long userId);

    @Query("SELECT fm FROM FamilyMember fm WHERE fm.isActive = true AND " +
           "(LOWER(fm.firstName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(fm.lastName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(fm.middleName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(fm.phone) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<FamilyMember> search(String search, Pageable pageable);

    @Query("SELECT fm FROM FamilyMember fm " +
           "WHERE fm.user IS NULL AND fm.isActive = true " +
           "AND LOWER(TRIM(fm.firstName)) = LOWER(TRIM(:firstName)) " +
           "AND fm.gender = :gender " +
           "AND (EXISTS (SELECT fp FROM FamilyPartner fp WHERE fp.person = fm) " +
           "  OR EXISTS (SELECT fc FROM FamilyChild fc WHERE fc.person = fm))")
    List<FamilyMember> findUnlinkedMembersWithRelationships(
        @Param("firstName") String firstName,
        @Param("gender") Gender gender);
}
