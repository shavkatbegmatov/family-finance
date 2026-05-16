package uz.familyfinance.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkOperationResponse {

    /** Muvaffaqiyatli bajarilgan tranzaksiya soni. */
    private int successCount;

    /** Muvaffaqiyatsiz tranzaksiya ID lari va xato sabablari. */
    private List<BulkOperationFailure> failures;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BulkOperationFailure {
        private Long transactionId;
        private String reason;
    }
}
