package uz.familyfinance.api.dto.request;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Xonadonni guruhga biriktirish/uzish so'rovi (ADR-001 decoupling UX).
 *
 * <p>{@code parentScopeId} — biriktiriladigan GROUP scope ID'si;
 * {@code null} bo'lsa xonadon joriy guruhidan uziladi (mustaqil root bo'ladi).</p>
 */
@Getter
@Setter
@NoArgsConstructor
public class SetScopeParentRequest {

    /** Yangi ota GROUP scope ID; null = guruhdan chiqarish (root qilish). */
    private Long parentScopeId;
}
