package uz.familyfinance.api.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import uz.familyfinance.api.entity.Category;
import uz.familyfinance.api.enums.CategoryType;

import java.util.List;

public interface CategoryRepository extends JpaRepository<Category, Long> {
    List<Category> findByTypeAndIsActiveTrue(CategoryType type);
    List<Category> findByParentIsNullAndIsActiveTrue();
    List<Category> findByParentIsNullAndTypeAndIsActiveTrue(CategoryType type);
    List<Category> findByIsActiveTrue();
    Page<Category> findByIsActiveTrue(Pageable pageable);
    boolean existsByNameAndType(String name, CategoryType type);

    @Query("SELECT DISTINCT c FROM Category c LEFT JOIN FETCH c.children WHERE c.parent IS NULL AND c.isActive = true AND c.type = :type")
    List<Category> findRootsWithChildrenByType(@Param("type") CategoryType type);

    @Query("SELECT DISTINCT c FROM Category c LEFT JOIN FETCH c.children WHERE c.parent IS NULL AND c.isActive = true")
    List<Category> findRootsWithChildren();
}
