package uz.familyfinance.api.dto.response;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class BankResponse {
    private Long id;
    private String name;
    private String shortName;
    private String mfo;
    private String logoUrl;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private List<String> binPrefixes;
}
