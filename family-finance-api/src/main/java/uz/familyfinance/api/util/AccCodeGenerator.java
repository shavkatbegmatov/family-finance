package uz.familyfinance.api.util;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * 20 xonali bank hisob raqami (acc_code) generatori.
 *
 * Struktura: CCCCC + VVV + K + XXXXXX + YY + NNN = 20 belgi
 *
 * CCCCC  (1-5)   = Balans hisobi kodi (Lex.uz standart: 10101, 20202, ...)
 * VVV    (6-8)   = Valyuta kodi (ISO 4217 raqamli: 000=UZS, 840=USD, 978=EUR)
 * K      (9)     = Nazorat kaliti (Checksum) - O'zR Markaziy banki algoritmi
 * XXXXXX (10-15) = Oila kodi (Family ID, 6 xona)
 * YY     (16-17) = A'zo kodi (Member ID, 2 xona)
 * NNN    (18-20) = Tartib raqami (Hisob tartibi, 3 xona)
 *
 * Misol: 20202 000 7 001234 01 001 = UZS bank karta hisobi
 */
public class AccCodeGenerator {

    private AccCodeGenerator() {
    }

    /**
     * 20 xonali hisob raqamini generatsiya qiladi.
     *
     * @param balanceCode  5 xonali balans hisobi kodi (masalan, "20202")
     * @param currencyCode 3 xonali valyuta kodi (masalan, "000")
     * @param familyId     Oila ID si (1 dan 999999 gacha)
     * @param memberId     A'zo ID si (1 dan 99 gacha)
     * @param serialNumber Tartib raqami (1 dan 999 gacha)
     * @return 20 xonali acc_code
     */
    public static String generate(String balanceCode, String currencyCode,
                                  long familyId, int memberId, int serialNumber) {
        validateInput(balanceCode, currencyCode, familyId, memberId, serialNumber);

        String paddedFamily = String.format("%06d", familyId);
        String paddedMember = String.format("%02d", memberId);
        String paddedSerial = String.format("%03d", serialNumber);

        // Birinchi 8 ta raqam (checksum hisoblanishidan oldin)
        String first8 = balanceCode + currencyCode;
        int checkDigit = calculateCheckDigit(first8);

        return first8 + checkDigit + paddedFamily + paddedMember + paddedSerial;
    }

    /**
     * Nazorat kalitini (check digit) hisoblaydi.
     * O'zbekiston Markaziy banki algoritmiga asoslangan (modul 7).
     *
     * Algoritm: Birinchi 8 ta raqamning har biri o'z vazn koeffitsiyentiga
     * ko'paytiriladi, yig'indi 7 ga bo'linadi, qoldiq nazorat raqami bo'ladi.
     *
     * Vazn koeffitsiyentlari: [7, 1, 3, 7, 1, 3, 7, 1]
     */
    public static int calculateCheckDigit(String first8Digits) {
        if (first8Digits.length() != 8) {
            throw new IllegalArgumentException("Birinchi 8 ta raqam kerak, berilgan: " + first8Digits.length());
        }

        int[] weights = {7, 1, 3, 7, 1, 3, 7, 1};
        int sum = 0;

        for (int i = 0; i < 8; i++) {
            int digit = Character.getNumericValue(first8Digits.charAt(i));
            sum += digit * weights[i];
        }

        return sum % 10;
    }

    /**
     * acc_code ni tarkibiy qismlarga ajratib beradi.
     */
    public static AccCodeParts parse(String accCode) {
        validateFormat(accCode);

        return new AccCodeParts(
                accCode.substring(0, 5),   // balanceCode
                accCode.substring(5, 8),   // currencyCode
                Character.getNumericValue(accCode.charAt(8)), // checkDigit
                accCode.substring(9, 15),  // familyId
                accCode.substring(15, 17), // memberId
                accCode.substring(17, 20)  // serialNumber
        );
    }

    /**
     * acc_code ni formatlangan ko'rinishda qaytaradi.
     * Masalan: "20202000700123401001" -> "20202 000 7 001234 01 001"
     */
    public static String formatForDisplay(String accCode) {
        validateFormat(accCode);

        return accCode.substring(0, 5) + " " +
                accCode.substring(5, 8) + " " +
                accCode.charAt(8) + " " +
                accCode.substring(9, 15) + " " +
                accCode.substring(15, 17) + " " +
                accCode.substring(17, 20);
    }

    /**
     * acc_code ning to'g'riligini tekshiradi (format va checksum).
     */
    public static boolean validate(String accCode) {
        if (accCode == null || accCode.length() != 20) {
            return false;
        }

        if (!accCode.matches("\\d{20}")) {
            return false;
        }

        String first8 = accCode.substring(0, 8);
        int expectedCheckDigit = calculateCheckDigit(first8);
        int actualCheckDigit = Character.getNumericValue(accCode.charAt(8));

        return expectedCheckDigit == actualCheckDigit;
    }

    private static void validateInput(String balanceCode, String currencyCode,
                                      long familyId, int memberId, int serialNumber) {
        if (balanceCode == null || !balanceCode.matches("\\d{5}")) {
            throw new IllegalArgumentException("Balans kodi 5 xonali raqam bo'lishi kerak: " + balanceCode);
        }
        if (currencyCode == null || !currencyCode.matches("\\d{3}")) {
            throw new IllegalArgumentException("Valyuta kodi 3 xonali raqam bo'lishi kerak: " + currencyCode);
        }
        if (familyId < 0 || familyId > 999999) {
            throw new IllegalArgumentException("Oila ID si 0 dan 999999 gacha bo'lishi kerak: " + familyId);
        }
        if (memberId < 0 || memberId > 99) {
            throw new IllegalArgumentException("A'zo ID si 0 dan 99 gacha bo'lishi kerak: " + memberId);
        }
        if (serialNumber < 1 || serialNumber > 999) {
            throw new IllegalArgumentException("Tartib raqami 1 dan 999 gacha bo'lishi kerak: " + serialNumber);
        }
    }

    private static void validateFormat(String accCode) {
        if (accCode == null || accCode.length() != 20 || !accCode.matches("\\d{20}")) {
            throw new IllegalArgumentException("acc_code 20 xonali raqam bo'lishi kerak: " + accCode);
        }
    }

    @Getter
    @AllArgsConstructor
    public static class AccCodeParts {
        private final String balanceCode;
        private final String currencyCode;
        private final int checkDigit;
        private final String familyId;
        private final String memberId;
        private final String serialNumber;
    }
}
