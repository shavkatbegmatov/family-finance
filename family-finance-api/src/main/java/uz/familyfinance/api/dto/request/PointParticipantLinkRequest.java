package uz.familyfinance.api.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class PointParticipantLinkRequest {

    @NotNull(message = "familyMemberId kiritilishi shart")
    private Long familyMemberId;

    @Size(max = 500, message = "Izoh 500 belgidan oshmasligi kerak")
    private String reason;

    /**
     * true bo'lsa, boshqa ishtirokchidan avtomatik transfer qilishga ruxsat beriladi.
     * null holatda true deb qabul qilinadi.
     */
    private Boolean forceTransfer = true;
}
