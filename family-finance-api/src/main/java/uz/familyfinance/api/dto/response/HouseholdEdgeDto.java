package uz.familyfinance.api.dto.response;

import lombok.Data;

/**
 * Ikki oila (FamilyUnit) orasidagi bog'lanish.
 *
 * <p>{@code fromUnitId} oilasidagi farzand ({@code viaChildPersonId}) {@code toUnitId}
 * oilasida ota/ona (partner) bo'lgan — ya'ni turmush qurib yangi oila tashkil etgan.</p>
 */
@Data
public class HouseholdEdgeDto {
    private Long fromUnitId;
    private Long toUnitId;
    private Long viaChildPersonId;
}
