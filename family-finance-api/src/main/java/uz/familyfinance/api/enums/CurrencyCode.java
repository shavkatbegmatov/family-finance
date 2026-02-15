package uz.familyfinance.api.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * ISO 4217 valyuta kodlari (3 xonali raqamli kod).
 */
@Getter
@RequiredArgsConstructor
public enum CurrencyCode {

    UZS("000", "UZS", "O'zbek so'mi"),
    USD("840", "USD", "AQSH dollari"),
    EUR("978", "EUR", "Yevro");

    private final String numericCode;
    private final String alphabeticCode;
    private final String displayName;

    public static CurrencyCode fromNumericCode(String numericCode) {
        for (CurrencyCode cc : values()) {
            if (cc.numericCode.equals(numericCode)) {
                return cc;
            }
        }
        throw new IllegalArgumentException("Noma'lum valyuta kodi: " + numericCode);
    }

    public static CurrencyCode fromAlphabeticCode(String alphabeticCode) {
        for (CurrencyCode cc : values()) {
            if (cc.alphabeticCode.equalsIgnoreCase(alphabeticCode)) {
                return cc;
            }
        }
        throw new IllegalArgumentException("Noma'lum valyuta kodi: " + alphabeticCode);
    }
}
