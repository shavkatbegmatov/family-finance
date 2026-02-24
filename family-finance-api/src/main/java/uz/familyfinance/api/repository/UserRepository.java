package uz.familyfinance.api.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import uz.familyfinance.api.entity.User;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
    List<User> findByActiveTrue();

    @Query("""
        SELECT DISTINCT u FROM User u
        LEFT JOIN FETCH u.roles r
        LEFT JOIN FETCH r.permissions
        WHERE u.username = :username
        """)
    Optional<User> findByUsernameWithRolesAndPermissions(@Param("username") String username);

    @Query("""
        SELECT DISTINCT u FROM User u
        LEFT JOIN FETCH u.roles r
        LEFT JOIN FETCH r.permissions
        WHERE u.id = :id
        """)
    Optional<User> findByIdWithRolesAndPermissions(@Param("id") Long id);

    // === User management queries ===

    @Query("""
        SELECT u FROM User u
        WHERE LOWER(u.username) LIKE LOWER(CONCAT('%', :search, '%'))
           OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :search, '%'))
           OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%'))
           OR u.phone LIKE CONCAT('%', :search, '%')
        """)
    Page<User> searchUsers(@Param("search") String search, Pageable pageable);

    @Query("""
        SELECT u FROM User u
        WHERE u.active = :active
          AND (LOWER(u.username) LIKE LOWER(CONCAT('%', :search, '%'))
            OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :search, '%'))
            OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%'))
            OR u.phone LIKE CONCAT('%', :search, '%'))
        """)
    Page<User> searchUsersByActive(
            @Param("search") String search,
            @Param("active") Boolean active,
            Pageable pageable
    );

    Page<User> findByActive(Boolean active, Pageable pageable);

    @Query("""
        SELECT DISTINCT u FROM User u
        LEFT JOIN FETCH u.roles r
        LEFT JOIN FETCH u.createdBy
        LEFT JOIN FETCH u.familyGroup
        WHERE u.id = :id
        """)
    Optional<User> findByIdWithDetails(@Param("id") Long id);
}
