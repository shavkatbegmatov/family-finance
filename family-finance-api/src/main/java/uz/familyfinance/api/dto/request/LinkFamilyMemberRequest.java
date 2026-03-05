package uz.familyfinance.api.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class LinkFamilyMemberRequest {

    @NotNull(message = "familyMemberId kiritilishi shart")
    private Long familyMemberId;

    @Size(max = 500, message = "Izoh 500 belgidan oshmasligi kerak")
    private String reason;

    /**
     * true bo'lsa, mavjud bog'lanishni avtomatik transfer qiladi.
     * null holatda ham true deb qabul qilinadi.
     */
    private Boolean forceTransfer = true;
}
