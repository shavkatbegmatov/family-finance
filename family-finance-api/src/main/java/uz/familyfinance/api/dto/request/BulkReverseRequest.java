package uz.familyfinance.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class BulkReverseRequest {

    @NotEmpty(message = "Tranzaksiya ID lari ro'yxati bo'sh bo'lmasligi kerak")
    @Size(max = 100, message = "Bir vaqtning o'zida 100 tadan ko'p tranzaksiya storno qilinmaydi")
    private List<Long> transactionIds;

    @NotBlank(message = "Storno sababi ko'rsatilishi shart")
    private String reason;
}
