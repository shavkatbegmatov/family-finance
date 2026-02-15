package uz.familyfinance.api.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum AccountType {

    CASH("10101"),
    BANK_CARD("20202"),
    SAVINGS("20406"),
    TERM_DEPOSIT("20606"),
    E_WALLET("10301"),
    CREDIT("12501"),
    SYSTEM_TRANSIT("99999");

    private final String balanceCode;

    public static AccountType fromBalanceCode(String balanceCode) {
        for (AccountType at : values()) {
            if (at.balanceCode.equals(balanceCode)) {
                return at;
            }
        }
        throw new IllegalArgumentException("Noma'lum balans kodi: " + balanceCode);
    }
}
