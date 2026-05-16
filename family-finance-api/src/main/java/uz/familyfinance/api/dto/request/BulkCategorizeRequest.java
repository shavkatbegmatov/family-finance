package uz.familyfinance.api.dto.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class BulkCategorizeRequest {

    @NotEmpty(message = "Tranzaksiya ID lari ro'yxati bo'sh bo'lmasligi kerak")
    @Size(max = 100, message = "Bir vaqtning o'zida 100 tadan ko'p tranzaksiya o'zgartirilmaydi")
    private List<Long> transactionIds;

    @NotNull(message = "Kategoriya ID si kerak")
    private Long categoryId;
}
