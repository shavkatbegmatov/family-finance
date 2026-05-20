package uz.familyfinance.api.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import uz.familyfinance.api.dto.request.PersonCreateRequest;
import uz.familyfinance.api.dto.response.ApiResponse;
import uz.familyfinance.api.dto.response.PersonCreateResponse;
import uz.familyfinance.api.enums.PermissionCode;
import uz.familyfinance.api.security.RequiresPermission;
import uz.familyfinance.api.service.PersonService;

/**
 * "Yangi shaxs qo'shish" wizard'i uchun controller.
 *
 * <p>FAMILY_CREATE ruxsati majburiy. Boshqa ruxsatlar (USERS_CREATE, POINTS_MANAGE)
 * tanlangan PersonType ga qarab PersonService ichida tekshiriladi.</p>
 */
@RestController
@RequestMapping("/v1/persons")
@RequiredArgsConstructor
public class PersonController {

    private final PersonService personService;

    @PostMapping
    @RequiresPermission(PermissionCode.FAMILY_CREATE)
    public ResponseEntity<ApiResponse<PersonCreateResponse>> createPerson(
            @Valid @RequestBody PersonCreateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(personService.createPerson(request)));
    }
}
