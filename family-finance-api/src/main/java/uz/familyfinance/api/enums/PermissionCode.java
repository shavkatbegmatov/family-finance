package uz.familyfinance.api.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum PermissionCode {

    // DASHBOARD
    DASHBOARD_VIEW("DASHBOARD", "VIEW"),

    // TRANSACTIONS
    TRANSACTIONS_VIEW("TRANSACTIONS", "VIEW"),
    TRANSACTIONS_CREATE("TRANSACTIONS", "CREATE"),
    TRANSACTIONS_UPDATE("TRANSACTIONS", "UPDATE"),
    TRANSACTIONS_DELETE("TRANSACTIONS", "DELETE"),
    TRANSACTIONS_EXPORT("TRANSACTIONS", "EXPORT"),

    // ACCOUNTS
    ACCOUNTS_VIEW("ACCOUNTS", "VIEW"),
    ACCOUNTS_CREATE("ACCOUNTS", "CREATE"),
    ACCOUNTS_UPDATE("ACCOUNTS", "UPDATE"),
    ACCOUNTS_DELETE("ACCOUNTS", "DELETE"),
    ACCOUNTS_TRANSFER("ACCOUNTS", "TRANSFER"),
    ACCOUNTS_EXPORT("ACCOUNTS", "EXPORT"),
    ACCOUNTS_ACCESS_MANAGE("ACCOUNTS", "MANAGE"),

    // CARDS
    CARDS_VIEW("CARDS", "VIEW"),
    CARDS_CREATE("CARDS", "CREATE"),
    CARDS_UPDATE("CARDS", "UPDATE"),
    CARDS_DELETE("CARDS", "DELETE"),
    CARDS_REVEAL("CARDS", "VIEW"),

    // TRANSACTIONS (storno, confirm, cancel)
    TRANSACTIONS_REVERSE("TRANSACTIONS", "DELETE"),
    TRANSACTIONS_CONFIRM("TRANSACTIONS", "CONFIRM"),
    TRANSACTIONS_CANCEL("TRANSACTIONS", "CANCEL"),

    // CATEGORIES
    CATEGORIES_VIEW("CATEGORIES", "VIEW"),
    CATEGORIES_CREATE("CATEGORIES", "CREATE"),
    CATEGORIES_UPDATE("CATEGORIES", "UPDATE"),
    CATEGORIES_DELETE("CATEGORIES", "DELETE"),

    // BUDGETS
    BUDGETS_VIEW("BUDGETS", "VIEW"),
    BUDGETS_CREATE("BUDGETS", "CREATE"),
    BUDGETS_UPDATE("BUDGETS", "UPDATE"),
    BUDGETS_DELETE("BUDGETS", "DELETE"),
    BUDGETS_EXPORT("BUDGETS", "EXPORT"),

    // SAVINGS
    SAVINGS_VIEW("SAVINGS", "VIEW"),
    SAVINGS_CREATE("SAVINGS", "CREATE"),
    SAVINGS_UPDATE("SAVINGS", "UPDATE"),
    SAVINGS_DELETE("SAVINGS", "DELETE"),
    SAVINGS_CONTRIBUTE("SAVINGS", "CONTRIBUTE"),
    SAVINGS_EXPORT("SAVINGS", "EXPORT"),

    // DEBTS
    DEBTS_VIEW("DEBTS", "VIEW"),
    DEBTS_CREATE("DEBTS", "CREATE"),
    DEBTS_UPDATE("DEBTS", "UPDATE"),
    DEBTS_DELETE("DEBTS", "DELETE"),
    DEBTS_PAY("DEBTS", "PAY"),
    DEBTS_EXPORT("DEBTS", "EXPORT"),

    // FAMILY MEMBERS
    FAMILY_VIEW("FAMILY", "VIEW"),
    FAMILY_CREATE("FAMILY", "CREATE"),
    FAMILY_UPDATE("FAMILY", "UPDATE"),
    FAMILY_DELETE("FAMILY", "DELETE"),
    FAMILY_EXPORT("FAMILY", "EXPORT"),

    // REPORTS
    REPORTS_VIEW("REPORTS", "VIEW"),
    REPORTS_EXPORT("REPORTS", "EXPORT"),

    // USERS
    USERS_VIEW("USERS", "VIEW"),
    USERS_CREATE("USERS", "CREATE"),
    USERS_UPDATE("USERS", "UPDATE"),
    USERS_DELETE("USERS", "DELETE"),
    USERS_CHANGE_ROLE("USERS", "CHANGE_ROLE"),

    // SETTINGS
    SETTINGS_VIEW("SETTINGS", "VIEW"),
    SETTINGS_UPDATE("SETTINGS", "UPDATE"),

    // NOTIFICATIONS
    NOTIFICATIONS_VIEW("NOTIFICATIONS", "VIEW"),
    NOTIFICATIONS_MANAGE("NOTIFICATIONS", "MANAGE"),

    // ROLES
    ROLES_VIEW("ROLES", "VIEW"),
    ROLES_CREATE("ROLES", "CREATE"),
    ROLES_UPDATE("ROLES", "UPDATE"),
    ROLES_DELETE("ROLES", "DELETE");

    private final String module;
    private final String action;

    public String getCode() {
        return this.name();
    }

    public static PermissionCode fromCode(String code) {
        for (PermissionCode permission : values()) {
            if (permission.name().equals(code)) {
                return permission;
            }
        }
        throw new IllegalArgumentException("Unknown permission code: " + code);
    }

    public static boolean isValidCode(String code) {
        for (PermissionCode permission : values()) {
            if (permission.name().equals(code)) {
                return true;
            }
        }
        return false;
    }
}
