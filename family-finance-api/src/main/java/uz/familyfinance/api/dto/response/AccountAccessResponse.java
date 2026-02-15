package uz.familyfinance.api.dto.response;

import lombok.Data;
import uz.familyfinance.api.enums.AccountAccessRole;
import java.time.LocalDateTime;

@Data
public class AccountAccessResponse {
    private Long id;
    private Long accountId;
    private Long userId;
    private String userName;
    private String userFullName;
    private AccountAccessRole role;
    private LocalDateTime grantedAt;
    private String grantedByName;
}
