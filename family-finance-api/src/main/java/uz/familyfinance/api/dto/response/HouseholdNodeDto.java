package uz.familyfinance.api.dto.response;

import lombok.Data;

import java.util.List;

/**
 * Xonadon-markazli daraxtda bitta xonadon (HOUSEHOLD scope) tuguni.
 *
 * <p>Bir scope'ga bir nechta FamilyUnit tegishli bo'lishi mumkin —
 * {@code parents}/{@code children} shu scope ostidagi barcha unit'lardan birlashtirilgan.</p>
 */
@Data
public class HouseholdNodeDto {
    private Long scopeId;
    private String displayCode;
    private String name;
    private List<Long> familyUnitIds;
    private List<PartnerResponse> parents;
    private List<ChildResponse> children;
}
