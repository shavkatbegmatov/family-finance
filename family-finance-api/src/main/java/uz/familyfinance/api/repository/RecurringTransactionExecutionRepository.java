package uz.familyfinance.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import uz.familyfinance.api.entity.RecurringTransactionExecution;

import java.time.LocalDate;

public interface RecurringTransactionExecutionRepository
        extends JpaRepository<RecurringTransactionExecution, Long> {

    boolean existsByTemplateIdAndExecutionDate(Long templateId, LocalDate executionDate);
}
