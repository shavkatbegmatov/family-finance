package uz.familyfinance.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.List;

@Data
public class BankRequest {
    @NotBlank(message = "Bank nomi kiritilishi shart")
    private String name;

    private String shortName;

    private String mfo;

    private String logoUrl;

    private Boolean isActive;

    private List<String> binPrefixes;
}
