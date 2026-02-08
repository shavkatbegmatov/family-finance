package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.dto.request.BudgetRequest;
import uz.familyfinance.api.dto.response.BudgetResponse;
import uz.familyfinance.api.entity.Budget;
import uz.familyfinance.api.entity.Category;
import uz.familyfinance.api.enums.TransactionType;
import uz.familyfinance.api.exception.ResourceNotFoundException;
import uz.familyfinance.api.repository.BudgetRepository;
import uz.familyfinance.api.repository.CategoryRepository;
import uz.familyfinance.api.repository.TransactionRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class BudgetService {

    private final BudgetRepository budgetRepository;
    private final CategoryRepository categoryRepository;
    private final TransactionRepository transactionRepository;

    @Transactional(readOnly = true)
    public Page<BudgetResponse> getAll(Pageable pageable) {
        return budgetRepository.findByIsActiveTrue(pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public List<BudgetResponse> getActiveByDate(LocalDate date) {
        return budgetRepository.findActiveByDate(date).stream()
                .map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public BudgetResponse getById(Long id) {
        return toResponse(findById(id));
    }

    @Transactional
    public BudgetResponse create(BudgetRequest request) {
        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Kategoriya topilmadi"));

        Budget budget = Budget.builder()
                .category(category)
                .amount(request.getAmount())
                .period(request.getPeriod())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .build();

        return toResponse(budgetRepository.save(budget));
    }

    @Transactional
    public BudgetResponse update(Long id, BudgetRequest request) {
        Budget budget = findById(id);
        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Kategoriya topilmadi"));

        budget.setCategory(category);
        budget.setAmount(request.getAmount());
        budget.setPeriod(request.getPeriod());
        budget.setStartDate(request.getStartDate());
        budget.setEndDate(request.getEndDate());

        return toResponse(budgetRepository.save(budget));
    }

    @Transactional
    public void delete(Long id) {
        Budget budget = findById(id);
        budget.setIsActive(false);
        budgetRepository.save(budget);
    }

    private Budget findById(Long id) {
        return budgetRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Byudjet topilmadi: " + id));
    }

    private BudgetResponse toResponse(Budget b) {
        BudgetResponse r = new BudgetResponse();
        r.setId(b.getId());
        r.setAmount(b.getAmount());
        r.setPeriod(b.getPeriod());
        r.setStartDate(b.getStartDate());
        r.setEndDate(b.getEndDate());
        r.setIsActive(b.getIsActive());
        r.setCreatedAt(b.getCreatedAt());

        if (b.getCategory() != null) {
            r.setCategoryId(b.getCategory().getId());
            r.setCategoryName(b.getCategory().getName());
            r.setCategoryIcon(b.getCategory().getIcon());
            r.setCategoryColor(b.getCategory().getColor());
        }

        // Calculate spent amount
        LocalDateTime from = b.getStartDate().atStartOfDay();
        LocalDateTime to = b.getEndDate().atTime(23, 59, 59);
        BigDecimal spent = transactionRepository.sumExpenseByCategoryAndDateRange(b.getCategory().getId(), from, to);
        r.setSpentAmount(spent);
        r.setRemainingAmount(b.getAmount().subtract(spent));
        if (b.getAmount().compareTo(BigDecimal.ZERO) > 0) {
            r.setPercentage(spent.multiply(BigDecimal.valueOf(100))
                    .divide(b.getAmount(), 2, RoundingMode.HALF_UP).doubleValue());
        } else {
            r.setPercentage(0.0);
        }

        return r;
    }
}
