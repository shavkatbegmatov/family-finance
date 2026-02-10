package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.dto.request.DebtPaymentRequest;
import uz.familyfinance.api.dto.request.DebtRequest;
import uz.familyfinance.api.dto.response.DebtPaymentResponse;
import uz.familyfinance.api.dto.response.DebtResponse;
import uz.familyfinance.api.entity.Debt;
import uz.familyfinance.api.entity.DebtPayment;
import uz.familyfinance.api.enums.DebtStatus;
import uz.familyfinance.api.enums.DebtType;
import uz.familyfinance.api.exception.BadRequestException;
import uz.familyfinance.api.exception.ResourceNotFoundException;
import uz.familyfinance.api.repository.DebtPaymentRepository;
import uz.familyfinance.api.repository.DebtRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DebtService {

    private final DebtRepository debtRepository;
    private final DebtPaymentRepository debtPaymentRepository;

    @Transactional(readOnly = true)
    public Page<DebtResponse> getAll(DebtType type, DebtStatus status, String search, Pageable pageable) {
        return debtRepository.findWithFilters(type, status, search, pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public DebtResponse getById(Long id) {
        return toResponse(findById(id));
    }

    @Transactional
    public DebtResponse create(DebtRequest request) {
        Debt debt = Debt.builder()
                .type(request.getType())
                .personName(request.getPersonName())
                .personPhone(request.getPersonPhone())
                .amount(request.getAmount())
                .remainingAmount(request.getAmount())
                .dueDate(request.getDueDate())
                .description(request.getDescription())
                .status(DebtStatus.ACTIVE)
                .build();
        return toResponse(debtRepository.save(debt));
    }

    @Transactional
    public DebtResponse update(Long id, DebtRequest request) {
        Debt debt = findById(id);
        debt.setType(request.getType());
        debt.setPersonName(request.getPersonName());
        debt.setPersonPhone(request.getPersonPhone());
        debt.setDueDate(request.getDueDate());
        debt.setDescription(request.getDescription());
        return toResponse(debtRepository.save(debt));
    }

    @Transactional
    public void delete(Long id) {
        if (!debtRepository.existsById(id)) {
            throw new ResourceNotFoundException("Qarz topilmadi: " + id);
        }
        debtRepository.deleteById(id);
    }

    @Transactional
    public DebtPaymentResponse addPayment(Long debtId, DebtPaymentRequest request) {
        Debt debt = findById(debtId);

        BigDecimal paymentAmount = request.getAmount().setScale(2, RoundingMode.HALF_UP);
        BigDecimal remaining = debt.getRemainingAmount().setScale(2, RoundingMode.HALF_UP);

        if (paymentAmount.compareTo(remaining) > 0) {
            throw new BadRequestException("To'lov summasi qoldiq summadan oshmasligi kerak");
        }

        DebtPayment payment = DebtPayment.builder()
                .debt(debt)
                .amount(paymentAmount)
                .paymentDate(request.getPaymentDate())
                .note(request.getNote())
                .build();
        debtPaymentRepository.save(payment);

        BigDecimal newRemaining = remaining.subtract(paymentAmount).setScale(2, RoundingMode.HALF_UP);
        debt.setRemainingAmount(newRemaining);
        if (newRemaining.compareTo(BigDecimal.ZERO) <= 0) {
            debt.setStatus(DebtStatus.PAID);
        } else {
            debt.setStatus(DebtStatus.PARTIALLY_PAID);
        }
        debtRepository.save(debt);

        return toPaymentResponse(payment);
    }

    @Transactional(readOnly = true)
    public List<DebtPaymentResponse> getPayments(Long debtId) {
        return debtPaymentRepository.findByDebtIdOrderByPaymentDateDesc(debtId).stream()
                .map(this::toPaymentResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public BigDecimal getTotalGiven() {
        return debtRepository.sumRemainingByType(DebtType.GIVEN);
    }

    @Transactional(readOnly = true)
    public BigDecimal getTotalTaken() {
        return debtRepository.sumRemainingByType(DebtType.TAKEN);
    }

    private Debt findById(Long id) {
        return debtRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Qarz topilmadi: " + id));
    }

    private DebtResponse toResponse(Debt d) {
        DebtResponse r = new DebtResponse();
        r.setId(d.getId());
        r.setType(d.getType());
        r.setPersonName(d.getPersonName());
        r.setPersonPhone(d.getPersonPhone());
        r.setAmount(d.getAmount());
        r.setRemainingAmount(d.getRemainingAmount());
        r.setPaidAmount(d.getAmount().subtract(d.getRemainingAmount()));
        r.setDueDate(d.getDueDate());
        r.setStatus(d.getStatus());
        r.setDescription(d.getDescription());
        r.setCreatedAt(d.getCreatedAt());
        r.setIsOverdue(d.getDueDate() != null && d.getDueDate().isBefore(LocalDate.now())
                && d.getStatus() != DebtStatus.PAID);
        if (d.getAmount().compareTo(BigDecimal.ZERO) > 0) {
            r.setPaidPercentage(d.getAmount().subtract(d.getRemainingAmount())
                    .multiply(BigDecimal.valueOf(100))
                    .divide(d.getAmount(), 2, RoundingMode.HALF_UP).doubleValue());
        } else {
            r.setPaidPercentage(0.0);
        }
        return r;
    }

    private DebtPaymentResponse toPaymentResponse(DebtPayment p) {
        DebtPaymentResponse r = new DebtPaymentResponse();
        r.setId(p.getId());
        r.setAmount(p.getAmount());
        r.setPaymentDate(p.getPaymentDate());
        r.setNote(p.getNote());
        r.setCreatedAt(p.getCreatedAt());
        if (p.getDebt() != null) {
            r.setDebtId(p.getDebt().getId());
            r.setDebtPersonName(p.getDebt().getPersonName());
        }
        return r;
    }
}
