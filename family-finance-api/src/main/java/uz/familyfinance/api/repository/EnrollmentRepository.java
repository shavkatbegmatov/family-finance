package uz.familyfinance.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import uz.familyfinance.api.entity.Enrollment;
import uz.familyfinance.api.enums.EnrollmentStatus;

import java.util.List;
import java.util.Optional;

public interface EnrollmentRepository extends JpaRepository<Enrollment, Long> {

    Optional<Enrollment> findByClassScopeIdAndFamilyMemberId(Long classScopeId, Long familyMemberId);

    List<Enrollment> findByClassScopeIdAndStatus(Long classScopeId, EnrollmentStatus status);

    /** Bola yozilgan barcha faol sinflar (ota-ona ko'rinishi uchun). */
    List<Enrollment> findByFamilyMemberIdAndStatus(Long familyMemberId, EnrollmentStatus status);

    /** Ota-ona (consent bergan user) yozgan barcha faol enrollmentlar. */
    @Query("SELECT e FROM Enrollment e JOIN FETCH e.classScope JOIN FETCH e.familyMember " +
           "WHERE e.consentBy.id = :userId AND e.status = 'ENROLLED'")
    List<Enrollment> findActiveByConsentUser(@Param("userId") Long userId);
}
