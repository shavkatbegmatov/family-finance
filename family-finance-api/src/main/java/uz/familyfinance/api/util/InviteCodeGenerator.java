package uz.familyfinance.api.util;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import uz.familyfinance.api.enums.ScopeType;
import uz.familyfinance.api.repository.ScopeRepository;

import java.security.SecureRandom;

/**
 * Scope invite code generator — global, ScopeService va AuthService ikkalasida ishlatiladi.
 *
 * <p>Format: prefiks (1 char) + 10 ta belgi (alphabet'dan). Misol: <code>CABCDEF2345</code>.
 * Alphabet'da O/0, I/1, L kabi adashtirib o'qish mumkin bo'lganlar yo'q.</p>
 *
 * <p>Brute-force xavfsizligi: ~2.5 × 10^14 variant + DB unique constraint.</p>
 */
@Component
@RequiredArgsConstructor
public class InviteCodeGenerator {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int CODE_LENGTH = 10;
    private static final int MAX_ATTEMPTS = 20;

    private final ScopeRepository scopeRepository;

    /** Berilgan scope turi uchun unique kod yaratadi. */
    public String generateForType(ScopeType type) {
        char prefix = prefixFor(type);
        for (int attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            String code = buildCode(prefix);
            if (!scopeRepository.existsByUniqueCode(code)) {
                return code;
            }
        }
        throw new IllegalStateException("Unique invite code yaratib bo'lmadi " + MAX_ATTEMPTS + " urinishda");
    }

    private String buildCode(char prefix) {
        StringBuilder sb = new StringBuilder(CODE_LENGTH + 1);
        sb.append(prefix);
        for (int i = 0; i < CODE_LENGTH; i++) {
            sb.append(CODE_ALPHABET.charAt(RANDOM.nextInt(CODE_ALPHABET.length())));
        }
        return sb.toString();
    }

    private char prefixFor(ScopeType type) {
        return switch (type) {
            case CLAN -> 'C';
            case HOUSEHOLD -> 'H';
            case PROJECT -> 'P';
            case EVENT -> 'E';
            case FUND -> 'F';
            case TRUSTEE -> 'T';
            case PROPERTY -> 'R';
        };
    }
}
