package uz.familyfinance.api.dto.response;

import lombok.Data;

import java.util.List;

/**
 * Xonadon-markazli daraxtda bitta tugun = bitta {@link uz.familyfinance.api.entity.FamilyUnit}
 * (nikoh birligi: ota-ona + farzandlar) — diagrammadagi har bir "xonadon" qutisi.
 *
 * <p>{@code scopeId}/{@code displayCode} — bu oila tegishli byudjet-xonadon (HOUSEHOLD scope).
 * Bir scope'da bir nechta oila bo'lishi mumkin; har biri alohida tugun, lekin bir xil
 * {@code displayCode}'ni ulashadi.</p>
 */
@Data
public class HouseholdNodeDto {
    private Long familyUnitId;
    private Long scopeId;
    private String displayCode;
    private String name;
    private List<PartnerResponse> parents;
    private List<ChildResponse> children;
}
