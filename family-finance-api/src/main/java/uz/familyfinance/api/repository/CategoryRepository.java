package uz.familyfinance.api.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
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
}
