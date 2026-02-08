package uz.familyfinance.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import uz.familyfinance.api.entity.Category;

import java.util.List;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {
    List<Category> findByActiveTrue();
    List<Category> findByParentIsNullAndActiveTrue();
    List<Category> findByParentIdAndActiveTrue(Long parentId);
}
