package uz.familyfinance.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import uz.familyfinance.api.entity.FamilyUnit;

import java.util.List;
import java.util.Optional;

public interface FamilyUnitRepository extends JpaRepository<FamilyUnit, Long> {

    @Query("SELECT DISTINCT fu FROM FamilyUnit fu " +
           "LEFT JOIN FETCH fu.partners p LEFT JOIN FETCH p.person " +
           "LEFT JOIN FETCH fu.children c LEFT JOIN FETCH c.person " +
           "WHERE fu.id = :id")
    Optional<FamilyUnit> findByIdWithRelations(@Param("id") Long id);

    @Query("SELECT DISTINCT fu FROM FamilyUnit fu " +
           "LEFT JOIN FETCH fu.partners p LEFT JOIN FETCH p.person " +
           "LEFT JOIN FETCH fu.children c LEFT JOIN FETCH c.person " +
           "WHERE EXISTS (SELECT 1 FROM FamilyPartner fp WHERE fp.familyUnit = fu AND fp.person.id = :personId)")
    List<FamilyUnit> findByPartnerIdWithRelations(@Param("personId") Long personId);

    @Query("SELECT DISTINCT fu FROM FamilyUnit fu " +
           "LEFT JOIN FETCH fu.partners p LEFT JOIN FETCH p.person " +
           "LEFT JOIN FETCH fu.children c LEFT JOIN FETCH c.person " +
           "WHERE EXISTS (SELECT 1 FROM FamilyChild fc WHERE fc.familyUnit = fu AND fc.person.id = :personId)")
    List<FamilyUnit> findByChildIdWithRelations(@Param("personId") Long personId);

    @Query("SELECT DISTINCT fu FROM FamilyUnit fu " +
           "JOIN fu.partners p WHERE p.person.id = :personId")
    List<FamilyUnit> findByPartnerId(@Param("personId") Long personId);

    @Query("SELECT DISTINCT fu FROM FamilyUnit fu " +
           "JOIN fu.children c WHERE c.person.id = :personId")
    List<FamilyUnit> findByChildId(@Param("personId") Long personId);
}
