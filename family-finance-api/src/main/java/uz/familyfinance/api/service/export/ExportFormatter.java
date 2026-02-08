package uz.familyfinance.api.service.export;

import org.springframework.stereotype.Component;
import uz.familyfinance.api.enums.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Service for formatting export values based on column configuration.
 * Handles currency, dates, enums, booleans, and sensitive data masking.
 */
@Component
public class ExportFormatter {

    private static final DateTimeFormatter DATE_FORMATTER =
        DateTimeFormatter.ofPattern("dd.MM.yyyy");
    private static final DateTimeFormatter DATETIME_FORMATTER =
        DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm:ss");

    public Object format(Object value, ExportColumnConfig config) {
        if (value == null) return "-";

        // Sensitive data masking
        if (config.isSensitive()) {
            return maskSensitiveData(value.toString());
        }

        return switch (config.getType()) {
            case CURRENCY -> formatCurrency((BigDecimal) value);
            case DATE -> formatDate((LocalDate) value);
            case DATETIME -> formatDateTime((LocalDateTime) value);
            case ENUM -> formatEnum(value);
            case BOOLEAN -> formatBoolean((Boolean) value);
            case NUMBER -> value.toString();
            default -> value.toString();
        };
    }

    private String formatCurrency(BigDecimal value) {
        return String.format("%,.2f so'm", value);
    }

    private String formatDate(LocalDate value) {
        return value.format(DATE_FORMATTER);
    }

    private String formatDateTime(LocalDateTime value) {
        return value.format(DATETIME_FORMATTER);
    }

    private String formatEnum(Object value) {
        if (value instanceof DebtStatus status) {
            return switch (status) {
                case ACTIVE -> "Faol";
                case PARTIALLY_PAID -> "Qisman to'langan";
                case PAID -> "To'langan";
                case OVERDUE -> "Muddati o'tgan";
            };
        }
        if (value instanceof DebtType type) {
            return switch (type) {
                case GIVEN -> "Berilgan";
                case TAKEN -> "Olingan";
            };
        }
        if (value instanceof TransactionType type) {
            return switch (type) {
                case INCOME -> "Kirim";
                case EXPENSE -> "Chiqim";
                case TRANSFER -> "O'tkazma";
            };
        }
        if (value instanceof AccountType type) {
            return switch (type) {
                case CASH -> "Naqd pul";
                case BANK_CARD -> "Bank kartasi";
                case SAVINGS -> "Jamg'arma";
                case E_WALLET -> "Elektron hamyon";
            };
        }
        if (value instanceof CategoryType type) {
            return switch (type) {
                case INCOME -> "Kirim";
                case EXPENSE -> "Chiqim";
            };
        }
        if (value instanceof BudgetPeriod period) {
            return switch (period) {
                case WEEKLY -> "Haftalik";
                case MONTHLY -> "Oylik";
                case YEARLY -> "Yillik";
            };
        }
        if (value instanceof FamilyRole role) {
            return switch (role) {
                case FATHER -> "Ota";
                case MOTHER -> "Ona";
                case CHILD -> "Farzand";
                case OTHER -> "Boshqa";
            };
        }
        // Default fallback for unknown enums
        return value.toString();
    }

    private String formatBoolean(Boolean value) {
        return value ? "Ha" : "Yo'q";
    }

    private String maskSensitiveData(String value) {
        if (value.length() <= 4) return "****";
        return "*".repeat(value.length() - 4) + value.substring(value.length() - 4);
    }
}
