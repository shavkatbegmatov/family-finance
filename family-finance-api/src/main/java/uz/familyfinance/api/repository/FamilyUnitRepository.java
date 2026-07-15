package uz.familyfinance.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import uz.familyfinance.api.entity.FamilyUnit;
import uz.familyfinance.api.entity.Scope;
import uz.familyfinance.api.enums.ScopeType;

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
           "WHERE EXISTS (SELECT 1 FROM FamilyPartner fp1 WHERE fp1.familyUnit = fu AND fp1.person.id = :person1Id) " +
           "AND EXISTS (SELECT 1 FROM FamilyPartner fp2 WHERE fp2.familyUnit = fu AND fp2.person.id = :person2Id)")
    List<FamilyUnit> findByPartnerPair(@Param("person1Id") Long person1Id, @Param("person2Id") Long person2Id);

    @Query("SELECT DISTINCT fu FROM FamilyUnit fu " +
           "JOIN fu.children c WHERE c.person.id = :personId")
    List<FamilyUnit> findByChildId(@Param("personId") Long personId);

    @Query("SELECT DISTINCT fu FROM FamilyUnit fu " +
           "LEFT JOIN FETCH fu.partners p LEFT JOIN FETCH p.person " +
           "LEFT JOIN FETCH fu.children c LEFT JOIN FETCH c.person " +
           "WHERE fu.scope.id = :scopeId")
    List<FamilyUnit> findByScopeIdWithRelations(@Param("scopeId") Long scopeId);

    /**
     * Shaxs partner bo'lgan nikoh birliklarining byudjet-xonadonlari (ADR-001 F4).
     * FamilyMember.scope o'chirilgach "a'zoning xonadoni" YAGONA manbadan — FamilyUnit.scope
     * ko'prigidan aniqlanadi (shaxs emas, oila xonadonga bog'lanadi).
     */
    // Tarqatilgan (DISSOLVED) nikoh yoki arxivlangan (isActive=false) scope hisobga
    // olinmaydi — aks holda qayta uylangan shaxs login'da eng eski/tugagan xonadonga
    // (primaryScope) tushib qolardi. ORDER BY fu.id DESC — barqaror va eng yangi birinchi.
    @Query("SELECT fu.scope FROM FamilyUnit fu JOIN fu.partners p " +
           "WHERE p.person.id = :personId AND fu.scope IS NOT NULL AND fu.scope.type = :type " +
           "AND fu.status <> uz.familyfinance.api.enums.FamilyUnitStatus.DISSOLVED " +
           "AND fu.scope.isActive = true " +
           "ORDER BY fu.id DESC")
    List<Scope> findScopesByPartnerIdAndType(@Param("personId") Long personId, @Param("type") ScopeType type);
}
