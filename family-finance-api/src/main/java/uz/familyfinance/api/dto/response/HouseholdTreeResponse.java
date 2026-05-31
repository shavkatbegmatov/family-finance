package uz.familyfinance.api.dto.response;

import lombok.Data;

import java.util.List;

/** Xonadon-markazli oila daraxti: xonadon tugunlari + ular orasidagi bog'lanishlar. */
@Data
public class HouseholdTreeResponse {
    private List<HouseholdNodeDto> households;
    private List<HouseholdEdgeDto> edges;
}
