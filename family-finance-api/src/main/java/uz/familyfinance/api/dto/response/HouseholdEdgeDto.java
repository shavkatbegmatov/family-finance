package uz.familyfinance.api.dto.response;

import lombok.Data;

/**
 * Ikki xonadon orasidagi bog'lanish.
 *
 * <p>{@code fromScopeId} xonadonida farzand bo'lgan shaxs ({@code viaChildPersonId})
 * {@code toScopeId} xonadonida ota/ona (partner) bo'lgan — ya'ni turmush qurib yangi
 * xonadon tashkil etgan.</p>
 */
@Data
public class HouseholdEdgeDto {
    private Long fromScopeId;
    private Long toScopeId;
    private Long viaChildPersonId;
}
