package uz.familyfinance.api.util;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import uz.familyfinance.api.repository.ScopeRepository;

import java.security.SecureRandom;

/**
 * HOUSEHOLD scope'lar uchun inson o'qiy oladigan qisqa raqam generatori.
 *
 * <p>Format: {@code GROUP_COUNT} ta guruh, har biri {@code GROUP_SIZE} raqam,
 * {@code SEPARATOR} bilan ajratilgan — masalan <code>278-541</code>.</p>
 *
 * <p>Scope invite {@link InviteCodeGenerator#generateForType} ({@code uniqueCode}) dan
 * ALOHIDA: bu sir emas, xonadonni UI'da ko'rsatish uchun. Unikallik DB unique index
 * va {@code existsByDisplayCode} tekshiruvi bilan kafolatlanadi.</p>
 */
@Component
@RequiredArgsConstructor
public class HouseholdCodeGenerator {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int GROUP_SIZE = 3;
    private static final int GROUP_COUNT = 2;
    private static final String SEPARATOR = "-";
    private static final int MAX_ATTEMPTS = 20;
    /** Bir guruh uchun yuqori chegara (10^GROUP_SIZE) — magic number emas, GROUP_SIZE bilan bog'liq. */
    private static final int GROUP_BOUND = (int) Math.pow(10, GROUP_SIZE);
    private static final String GROUP_FORMAT = "%0" + GROUP_SIZE + "d";

    private final ScopeRepository scopeRepository;

    /** Unique "NNN-NNN" xonadon raqamini yaratadi. */
    public String generate() {
        for (int attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            String code = buildCode();
            if (!scopeRepository.existsByDisplayCode(code)) {
                return code;
            }
        }
        throw new IllegalStateException(
                "Unique xonadon kodi yaratib bo'lmadi " + MAX_ATTEMPTS + " urinishda");
    }

    private String buildCode() {
        StringBuilder sb = new StringBuilder(GROUP_COUNT * GROUP_SIZE + GROUP_COUNT);
        for (int group = 0; group < GROUP_COUNT; group++) {
            if (group > 0) {
                sb.append(SEPARATOR);
            }
            sb.append(String.format(GROUP_FORMAT, RANDOM.nextInt(GROUP_BOUND)));
        }
        return sb.toString();
    }
}
