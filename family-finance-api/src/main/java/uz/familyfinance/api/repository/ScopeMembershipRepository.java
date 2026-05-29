package uz.familyfinance.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import uz.familyfinance.api.entity.ScopeMembership;
import uz.familyfinance.api.enums.MembershipStatus;
import uz.familyfinance.api.enums.ScopeRole;

import java.util.List;
import java.util.Optional;

@Repository
public interface ScopeMembershipRepository extends JpaRepository<ScopeMembership, Long> {

    Optional<ScopeMembership> findByScopeIdAndUserId(Long scopeId, Long userId);

    boolean existsByScopeIdAndUserIdAndStatus(Long scopeId, Long userId, MembershipStatus status);

    /** Berilgan user uchun barcha ACTIVE membership'lar (ScopeSwitcher uchun). */
    List<ScopeMembership> findByUserIdAndStatus(Long userId, MembershipStatus status);

    /** Berilgan scope'dagi barcha ACTIVE a'zolar (MembershipsTable uchun). */
    List<ScopeMembership> findByScopeIdAndStatus(Long scopeId, MembershipStatus status);

    /** Scope a'zolari sonini hisoblash. */
    long countByScopeIdAndStatus(Long scopeId, MembershipStatus status);

    /** Berilgan scope'ning OWNER'lari (kamida 1 ta OWNER kerak). */
    @Query("""
        SELECT m FROM ScopeMembership m
        WHERE m.scope.id = :scopeId
          AND m.role = :role
          AND m.status = 'ACTIVE'
        """)
    List<ScopeMembership> findByScopeIdAndRole(@Param("scopeId") Long scopeId, @Param("role") ScopeRole role);

    /** Berilgan user'ning scope ichidagi joriy roli (ACTIVE bo'lsa). */
    @Query("""
        SELECT m.role FROM ScopeMembership m
        WHERE m.scope.id = :scopeId
          AND m.user.id = :userId
          AND m.status = 'ACTIVE'
        """)
    Optional<ScopeRole> findActiveRole(@Param("scopeId") Long scopeId, @Param("userId") Long userId);
}
