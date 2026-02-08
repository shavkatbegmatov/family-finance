package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.dto.request.CategoryRequest;
import uz.familyfinance.api.dto.response.CategoryResponse;
import uz.familyfinance.api.entity.Category;
import uz.familyfinance.api.enums.CategoryType;
import uz.familyfinance.api.exception.BadRequestException;
import uz.familyfinance.api.exception.ResourceNotFoundException;
import uz.familyfinance.api.repository.CategoryRepository;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CategoryService {

    private final CategoryRepository categoryRepository;

    @Transactional(readOnly = true)
    public Page<CategoryResponse> getAll(Pageable pageable) {
        return categoryRepository.findByIsActiveTrue(pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public List<CategoryResponse> getByType(CategoryType type) {
        return categoryRepository.findByTypeAndIsActiveTrue(type).stream()
                .map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<CategoryResponse> getTree(CategoryType type) {
        List<Category> roots;
        if (type != null) {
            roots = categoryRepository.findByParentIsNullAndTypeAndIsActiveTrue(type);
        } else {
            roots = categoryRepository.findByParentIsNullAndIsActiveTrue();
        }
        return roots.stream().map(this::toTreeResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public CategoryResponse getById(Long id) {
        return toResponse(findById(id));
    }

    @Transactional
    public CategoryResponse create(CategoryRequest request) {
        Category category = Category.builder()
                .name(request.getName())
                .type(request.getType())
                .icon(request.getIcon())
                .color(request.getColor())
                .build();

        if (request.getParentId() != null) {
            Category parent = findById(request.getParentId());
            category.setParent(parent);
        }

        return toResponse(categoryRepository.save(category));
    }

    @Transactional
    public CategoryResponse update(Long id, CategoryRequest request) {
        Category category = findById(id);
        if (category.getIsSystem()) {
            throw new BadRequestException("Tizim kategoriyasini o'zgartirish mumkin emas");
        }
        category.setName(request.getName());
        category.setType(request.getType());
        category.setIcon(request.getIcon());
        category.setColor(request.getColor());

        if (request.getParentId() != null) {
            Category parent = findById(request.getParentId());
            category.setParent(parent);
        } else {
            category.setParent(null);
        }

        return toResponse(categoryRepository.save(category));
    }

    @Transactional
    public void delete(Long id) {
        Category category = findById(id);
        if (category.getIsSystem()) {
            throw new BadRequestException("Tizim kategoriyasini o'chirish mumkin emas");
        }
        category.setIsActive(false);
        categoryRepository.save(category);
    }

    @Transactional(readOnly = true)
    public List<Category> getAllActiveEntities() {
        return categoryRepository.findByIsActiveTrue();
    }

    private Category findById(Long id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Kategoriya topilmadi: " + id));
    }

    private CategoryResponse toResponse(Category c) {
        CategoryResponse r = new CategoryResponse();
        r.setId(c.getId());
        r.setName(c.getName());
        r.setType(c.getType());
        r.setIcon(c.getIcon());
        r.setColor(c.getColor());
        r.setIsSystem(c.getIsSystem());
        r.setIsActive(c.getIsActive());
        r.setCreatedAt(c.getCreatedAt());
        if (c.getParent() != null) {
            r.setParentId(c.getParent().getId());
            r.setParentName(c.getParent().getName());
        }
        return r;
    }

    private CategoryResponse toTreeResponse(Category c) {
        CategoryResponse r = toResponse(c);
        if (c.getChildren() != null && !c.getChildren().isEmpty()) {
            r.setChildren(c.getChildren().stream()
                    .filter(Category::getIsActive)
                    .map(this::toTreeResponse)
                    .collect(Collectors.toList()));
        } else {
            r.setChildren(new ArrayList<>());
        }
        return r;
    }
}
