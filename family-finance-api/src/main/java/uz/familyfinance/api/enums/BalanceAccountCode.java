package uz.familyfinance.api.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * O'zbekiston bank standartiga mos 5 xonali balans hisob kodlari.
 * Manba: https://lex.uz/ru/docs/-833361 (O'zR Markaziy banki schyotlar rejasi)
 */
@Getter
@RequiredArgsConstructor
public enum BalanceAccountCode {

    CASH("10101", "Naqd pul"),
    DEMAND_DEPOSIT("20202", "Talab qilib olinguncha depozit (Karta)"),
    SAVINGS_DEPOSIT("20406", "Jamg'arma depozit"),
    TERM_DEPOSIT("20606", "Muddatli depozit"),
    MICRO_CREDIT("12501", "Mikrokreditlar (Qarz)"),
    E_WALLET("10301", "Elektron hamyon"),
    SYSTEM_TRANSIT("99999", "Tizim tranzit hisobi");

    private final String code;
    private final String description;

    public static BalanceAccountCode fromCode(String code) {
        for (BalanceAccountCode bac : values()) {
            if (bac.code.equals(code)) {
                return bac;
            }
        }
        throw new IllegalArgumentException("Noma'lum balans hisob kodi: " + code);
    }
}
