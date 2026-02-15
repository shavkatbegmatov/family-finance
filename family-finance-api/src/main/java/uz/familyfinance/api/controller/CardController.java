package uz.familyfinance.api.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.familyfinance.api.dto.request.CardRequest;
import uz.familyfinance.api.dto.response.ApiResponse;
import uz.familyfinance.api.dto.response.CardResponse;
import uz.familyfinance.api.enums.PermissionCode;
import uz.familyfinance.api.security.RequiresPermission;
import uz.familyfinance.api.service.CardService;

import java.util.Map;

@RestController
@RequestMapping("/v1/cards")
@RequiredArgsConstructor
public class CardController {

    private final CardService cardService;

    @PutMapping("/{id}")
    @RequiresPermission(PermissionCode.CARDS_UPDATE)
    public ResponseEntity<ApiResponse<CardResponse>> update(@PathVariable Long id,
            @Valid @RequestBody CardRequest request) {
        return ResponseEntity.ok(ApiResponse.success(cardService.updateCard(id, request)));
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(PermissionCode.CARDS_DELETE)
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        cardService.deleteCard(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PostMapping("/{id}/reveal")
    @RequiresPermission(PermissionCode.CARDS_REVEAL)
    public ResponseEntity<ApiResponse<Map<String, String>>> reveal(@PathVariable Long id) {
        String fullNumber = cardService.revealCardNumber(id);
        return ResponseEntity.ok(ApiResponse.success(Map.of("cardNumber", fullNumber)));
    }
}
