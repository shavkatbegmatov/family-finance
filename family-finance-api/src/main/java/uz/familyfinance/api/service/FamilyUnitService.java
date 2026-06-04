package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.dto.request.AddChildRequest;
import uz.familyfinance.api.dto.request.AddParentsRequest;
import uz.familyfinance.api.dto.request.AddPartnerRequest;
import uz.familyfinance.api.dto.request.AddSpouseRequest;
import uz.familyfinance.api.dto.request.CreateFamilyUnitRequest;
import uz.familyfinance.api.dto.request.UpdateFamilyUnitRequest;
import uz.familyfinance.api.dto.response.*;
import uz.familyfinance.api.entity.*;
import uz.familyfinance.api.enums.FamilyRole;
import uz.familyfinance.api.enums.FamilyUnitStatus;
import uz.familyfinance.api.enums.Gender;
import uz.familyfinance.api.enums.LineageType;
import uz.familyfinance.api.enums.MarriageType;
import uz.familyfinance.api.enums.PartnerRole;
import uz.familyfinance.api.exception.ResourceNotFoundException;
import uz.familyfinance.api.repository.*;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class FamilyUnitService {

    /** Bir oila birligida (nikohda) maksimal partner soni. */
    private static final int MAX_PARTNERS_PER_UNIT = 2;

    private final FamilyUnitRepository familyUnitRepository;
    private final FamilyPartnerRepository familyPartnerRepository;
    private final FamilyChildRepository familyChildRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final FamilyTreeValidationService validationService;
    private final ScopeContextService scopeContext;
    private final HouseholdProvisioningService householdProvisioning;

    @Transactional
    public FamilyUnitResponse createFamilyUnit(CreateFamilyUnitRequest request) {
        if (request.getPartner2Id() != null) {
            validationService.validateNotSelfPartnership(request.getPartner1Id(), request.getPartner2Id());
            validationService.validateDuplicateMarriage(request.getPartner1Id(), request.getPartner2Id());
        }

        FamilyMember partner1 = findMember(request.getPartner1Id());

        // Har bir yangi oila o'zining alohida xonadoniga (displayCode) ega bo'ladi
        Scope household = createHouseholdForUnit(partner1.getFullName());

        FamilyUnit unit = FamilyUnit.builder()
                .marriageType(request.getMarriageType() != null ? request.getMarriageType() : MarriageType.MARRIED)
                .marriageDate(request.getMarriageDate())
                .status(FamilyUnitStatus.ACTIVE)
                .scope(household)
                .build();

        FamilyUnit saved = familyUnitRepository.save(unit);

        FamilyPartner fp1 = FamilyPartner.builder()
                .familyUnit(saved)
                .person(partner1)
                .role(PartnerRole.PARTNER1)
                .build();
        familyPartnerRepository.save(fp1);

        if (request.getPartner2Id() != null) {
            FamilyMember partner2 = findMember(request.getPartner2Id());
            FamilyPartner fp2 = FamilyPartner.builder()
                    .familyUnit(saved)
                    .person(partner2)
                    .role(PartnerRole.PARTNER2)
                    .build();
            familyPartnerRepository.save(fp2);
        }

        return getById(saved.getId());
    }

    /**
     * Shaxsga ota-ona qo'shish — ota, ona, nikoh va farzand bog'lanishi ATOMIK yaratiladi.
     * Biror bosqich xato bersa (masalan farzand allaqachon biologik ota-onaga ega),
     * butun tranzaksiya rollback bo'ladi — bo'sh nikoh yoki yetim shaxs qolmaydi.
     */
    @Transactional
    public FamilyUnitResponse addParents(AddParentsRequest request) {
        FamilyMember child = findMember(request.getChildPersonId());

        // Farzandda allaqachon biologik nikoh bo'lsa va unda kamida bitta TIRIK ota-ona qolgan
        // bo'lsa (bittasi o'chirilib, ikkinchisi tirik), yangi nikoh yaratmaymiz —
        // yetishmayotgan ota-onani o'sha mavjud nikohga qo'shamiz.
        Optional<FamilyUnit> reusable = findReusableBiologicalUnit(child.getId());
        if (reusable.isPresent()) {
            return attachMissingParents(reusable.get(), request);
        }

        // Eng muhim tekshiruv — AVVAL (hech narsa yaratishdan oldin). Yetim bog'lanish bo'lsa tozalanadi.
        validationService.validateBiologicalParentUnique(child.getId(), LineageType.BIOLOGICAL);

        // Ota-onaning oilasi uchun alohida xonadon (yangi yaratiladigan ota-ona ham shu xonadonga tegishli)
        Scope household = createHouseholdForUnit(request.getFatherFirstName());

        FamilyMember father = resolveOrCreateParent(request.getFatherId(), request.getFatherFirstName(),
                Gender.MALE, FamilyRole.FATHER, request.getFatherBirthDate(), household);
        FamilyMember mother = resolveOrCreateParent(request.getMotherId(), request.getMotherFirstName(),
                Gender.FEMALE, FamilyRole.MOTHER, request.getMotherBirthDate(), household);

        validationService.validateNotSelfPartnership(father.getId(), mother.getId());
        validationService.validateDuplicateMarriage(father.getId(), mother.getId());

        FamilyUnit unit = FamilyUnit.builder()
                .marriageType(request.getMarriageType() != null ? request.getMarriageType() : MarriageType.MARRIED)
                .marriageDate(request.getMarriageDate())
                .status(FamilyUnitStatus.ACTIVE)
                .scope(household)
                .build();
        FamilyUnit saved = familyUnitRepository.save(unit);

        familyPartnerRepository.save(FamilyPartner.builder()
                .familyUnit(saved).person(father).role(PartnerRole.PARTNER1).build());
        familyPartnerRepository.save(FamilyPartner.builder()
                .familyUnit(saved).person(mother).role(PartnerRole.PARTNER2).build());

        // Farzandni biriktirish — addChild logikasi (validatsiyalar bilan) qayta ishlatiladi
        AddChildRequest childReq = new AddChildRequest();
        childReq.setPersonId(child.getId());
        childReq.setLineageType(LineageType.BIOLOGICAL);
        return addChild(saved.getId(), childReq);
    }

    private FamilyMember resolveOrCreateParent(Long existingId, String firstName, Gender gender,
                                               FamilyRole role, LocalDate birthDate, Scope household) {
        if (existingId != null) {
            return findMember(existingId);
        }
        FamilyMember parent = FamilyMember.builder()
                .firstName(firstName != null ? firstName.trim() : null)
                .gender(gender)
                .role(role)
                .birthDate(birthDate)
                .scope(household)
                .build();
        return familyMemberRepository.save(parent);
    }

    /**
     * Farzandning biologik nikohi — agar mavjud bo'lsa va unda kamida bitta TIRIK ota-ona
     * qolgan bo'lsa (ya'ni ota-onadan biri o'chirilib, ikkinchisi tirik). Bunday nikoh
     * yangidan yaratilmasdan, yetishmayotgan ota-ona unga qo'shiladi.
     */
    private Optional<FamilyUnit> findReusableBiologicalUnit(Long childId) {
        return familyChildRepository.findByPersonIdAndLineageType(childId, LineageType.BIOLOGICAL)
                .map(FamilyChild::getFamilyUnit)
                .filter(unit -> familyPartnerRepository.findByFamilyUnitId(unit.getId()).stream()
                        .anyMatch(this::isLivingPartner));
    }

    private boolean isLivingPartner(FamilyPartner partner) {
        FamilyMember person = partner.getPerson();
        return person != null && !Boolean.FALSE.equals(person.getIsActive());
    }

    /**
     * Mavjud nikohga yetishmayotgan ota-onani qo'shadi. Avval o'chirilgan ota-onaning
     * yetim partner bog'lanishi tozalanadi (joy bo'shaydi), so'ng modal yuborgan ota/ona
     * (allaqachon partner bo'lmaganlari) qo'shiladi. Farzand allaqachon shu nikohda bo'lgani
     * uchun qayta bog'lanmaydi.
     */
    private FamilyUnitResponse attachMissingParents(FamilyUnit unit, AddParentsRequest request) {
        familyPartnerRepository.findByFamilyUnitId(unit.getId()).stream()
                .filter(partner -> !isLivingPartner(partner))
                .forEach(familyPartnerRepository::delete);

        attachParentIfAbsent(unit, request.getFatherId(), request.getFatherFirstName(),
                Gender.MALE, FamilyRole.FATHER, request.getFatherBirthDate());
        attachParentIfAbsent(unit, request.getMotherId(), request.getMotherFirstName(),
                Gender.FEMALE, FamilyRole.MOTHER, request.getMotherBirthDate());

        if (request.getMarriageType() != null) {
            unit.setMarriageType(request.getMarriageType());
        }
        if (request.getMarriageDate() != null) {
            unit.setMarriageDate(request.getMarriageDate());
        }
        familyUnitRepository.save(unit);
        return getById(unit.getId());
    }

    /** Yetishmayotgan ota yoki onani nikohga partner sifatida qo'shadi (allaqachon bor bo'lsa o'tkazib yuboradi). */
    private void attachParentIfAbsent(FamilyUnit unit, Long existingId, String firstName,
                                      Gender gender, FamilyRole role, LocalDate birthDate) {
        boolean hasInput = existingId != null || (firstName != null && !firstName.isBlank());
        if (!hasInput) {
            return;
        }
        if (existingId != null
                && familyPartnerRepository.findByFamilyUnitIdAndPersonId(unit.getId(), existingId).isPresent()) {
            return;
        }
        if (familyPartnerRepository.countByFamilyUnitId(unit.getId()) >= MAX_PARTNERS_PER_UNIT) {
            return;
        }
        FamilyMember parent = resolveOrCreateParent(existingId, firstName, gender, role, birthDate, unit.getScope());
        PartnerRole partnerRole = familyPartnerRepository.countByFamilyUnitId(unit.getId()) == 0
                ? PartnerRole.PARTNER1 : PartnerRole.PARTNER2;
        familyPartnerRepository.save(FamilyPartner.builder()
                .familyUnit(unit).person(parent).role(partnerRole).build());
    }

    /**
     * Yangi oila (FamilyUnit) uchun joriy aktiv urug' (CLAN) ostida alohida xonadon yaratadi.
     * Shu tufayli har bir oila o'z xonadon raqamiga ({@code displayCode}) ega bo'ladi.
     */
    private Scope createHouseholdForUnit(String label) {
        Scope clan = scopeContext.getActiveClanOptional().orElse(null);
        User owner = scopeContext.getCurrentUser();
        String name = (label != null && !label.isBlank() ? label.trim() : "Yangi oila") + " xonadoni";
        return householdProvisioning.createHousehold(clan, name, owner);
    }

    /**
     * Shaxsga turmush o'rtoq qo'shish. Agar shaxsda turmush o'rtoqsiz (yagona ota-ona)
     * nikoh bo'lsa — turmush o'rtoq O'SHA nikohga qo'shiladi (yangi nikoh yaratilmaydi),
     * shunda farzandlar bir nikohda qoladi va daraxtda to'g'ri ko'rinadi. Aks holda yangi nikoh.
     */
    @Transactional
    public FamilyUnitResponse addSpouse(AddSpouseRequest request) {
        FamilyMember person = findMember(request.getPersonId());

        // Mavjud yagona ota-onali nikoh bo'lsa — turmush o'rtoq O'SHA xonadonga qo'shiladi;
        // aks holda yangi nikoh (va yangi xonadon) createFamilyUnit orqali yaratiladi.
        Optional<FamilyUnit> singleUnit = findSingleParentUnit(person.getId());

        FamilyMember spouse;
        if (request.getSpouseId() != null) {
            spouse = findMember(request.getSpouseId());
        } else {
            // Yangi turmush o'rtoq: mavjud nikoh xonadoniga moslab biriktiramiz (aks holda aktiv xonadon)
            Scope spouseScope = singleUnit.map(FamilyUnit::getScope)
                    .orElseGet(() -> scopeContext.getActiveHousehold().orElse(null));
            spouse = familyMemberRepository.save(FamilyMember.builder()
                    .firstName(request.getSpouseFirstName() != null ? request.getSpouseFirstName().trim() : null)
                    .lastName(request.getSpouseLastName())
                    .middleName(request.getSpouseMiddleName())
                    .gender(request.getSpouseGender())
                    .role(FamilyRole.OTHER)
                    .birthDate(request.getSpouseBirthDate())
                    .scope(spouseScope)
                    .build());
        }

        validationService.validateNotSelfPartnership(person.getId(), spouse.getId());
        validationService.validateDuplicateMarriage(person.getId(), spouse.getId());

        if (singleUnit.isPresent()) {
            FamilyUnit unit = singleUnit.get();
            if (request.getMarriageType() != null) {
                unit.setMarriageType(request.getMarriageType());
            }
            if (request.getMarriageDate() != null) {
                unit.setMarriageDate(request.getMarriageDate());
            }
            familyUnitRepository.save(unit);
            familyPartnerRepository.save(FamilyPartner.builder()
                    .familyUnit(unit).person(spouse).role(PartnerRole.PARTNER2).build());
            return getById(unit.getId());
        }

        CreateFamilyUnitRequest createReq = new CreateFamilyUnitRequest();
        createReq.setPartner1Id(person.getId());
        createReq.setPartner2Id(spouse.getId());
        createReq.setMarriageType(request.getMarriageType());
        createReq.setMarriageDate(request.getMarriageDate());
        return createFamilyUnit(createReq);
    }

    /** Shaxs partner bo'lgan, faqat bitta partnerli (turmush o'rtoqsiz) nikoh. */
    private Optional<FamilyUnit> findSingleParentUnit(Long personId) {
        return familyUnitRepository.findByPartnerIdWithRelations(personId).stream()
                .filter(u -> u.getPartners().size() == 1
                        && u.getPartners().iterator().next().getPerson().getId().equals(personId))
                .findFirst();
    }

    @Transactional
    public FamilyUnitResponse updateFamilyUnit(Long id, UpdateFamilyUnitRequest request) {
        FamilyUnit unit = familyUnitRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Oila birligi topilmadi: " + id));

        if (request.getMarriageType() != null) {
            unit.setMarriageType(request.getMarriageType());
        }
        if (request.getStatus() != null) {
            unit.setStatus(request.getStatus());
        }
        if (request.getMarriageDate() != null) {
            unit.setMarriageDate(request.getMarriageDate());
        }
        if (request.getDivorceDate() != null) {
            unit.setDivorceDate(request.getDivorceDate());
        }

        familyUnitRepository.save(unit);
        return getById(id);
    }

    @Transactional
    public void deleteFamilyUnit(Long id) {
        FamilyUnit unit = familyUnitRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Oila birligi topilmadi: " + id));
        familyUnitRepository.delete(unit);
    }

    @Transactional
    public FamilyUnitResponse addPartner(Long familyUnitId, AddPartnerRequest request) {
        validationService.validateMaxPartners(familyUnitId);

        FamilyUnit unit = familyUnitRepository.findByIdWithRelations(familyUnitId)
                .orElseThrow(() -> new ResourceNotFoundException("Oila birligi topilmadi: " + familyUnitId));
        FamilyMember person = findMember(request.getPersonId());

        // Allaqachon bu unit da partner emasligini tekshirish
        familyPartnerRepository.findByFamilyUnitIdAndPersonId(familyUnitId, request.getPersonId())
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("Bu shaxs allaqachon oila birligida partner");
                });

        // Mavjud partnerlar bilan dublikat nikoh tekshirish
        for (FamilyPartner existingPartner : unit.getPartners()) {
            validationService.validateNotSelfPartnership(existingPartner.getPerson().getId(), request.getPersonId());
            validationService.validateDuplicateMarriage(existingPartner.getPerson().getId(), request.getPersonId());
        }

        long count = familyPartnerRepository.countByFamilyUnitId(familyUnitId);
        PartnerRole role = count == 0 ? PartnerRole.PARTNER1 : PartnerRole.PARTNER2;

        FamilyPartner partner = FamilyPartner.builder()
                .familyUnit(unit)
                .person(person)
                .role(role)
                .build();

        familyPartnerRepository.save(partner);
        return getById(familyUnitId);
    }

    @Transactional
    public FamilyUnitResponse removePartner(Long familyUnitId, Long personId) {
        FamilyPartner partner = familyPartnerRepository.findByFamilyUnitIdAndPersonId(familyUnitId, personId)
                .orElseThrow(() -> new ResourceNotFoundException("Partner topilmadi"));
        familyPartnerRepository.delete(partner);
        return getById(familyUnitId);
    }

    @Transactional
    public FamilyUnitResponse addChild(Long familyUnitId, AddChildRequest request) {
        validationService.validateNoAncestorCycle(familyUnitId, request.getPersonId());

        FamilyUnit unit = familyUnitRepository.findById(familyUnitId)
                .orElseThrow(() -> new ResourceNotFoundException("Oila birligi topilmadi: " + familyUnitId));
        FamilyMember person = findMember(request.getPersonId());

        // Allaqachon bu unit da farzand emasligini tekshirish
        familyChildRepository.findByFamilyUnitIdAndPersonId(familyUnitId, request.getPersonId())
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("Bu shaxs allaqachon oila birligida farzand");
                });

        validationService.validateChildBirthDate(familyUnitId, request.getPersonId());

        LineageType lineageType = request.getLineageType() != null ? request.getLineageType() : LineageType.BIOLOGICAL;
        validationService.validateBiologicalParentUnique(request.getPersonId(), lineageType);

        FamilyChild child = FamilyChild.builder()
                .familyUnit(unit)
                .person(person)
                .lineageType(lineageType)
                .birthOrder(request.getBirthOrder())
                .build();

        familyChildRepository.save(child);
        return getById(familyUnitId);
    }

    @Transactional
    public FamilyUnitResponse removeChild(Long familyUnitId, Long personId) {
        FamilyChild child = familyChildRepository.findByFamilyUnitIdAndPersonId(familyUnitId, personId)
                .orElseThrow(() -> new ResourceNotFoundException("Farzand topilmadi"));
        familyChildRepository.delete(child);
        return getById(familyUnitId);
    }

    @Transactional(readOnly = true)
    public FamilyUnitResponse getById(Long id) {
        FamilyUnit unit = familyUnitRepository.findByIdWithRelations(id)
                .orElseThrow(() -> new ResourceNotFoundException("Oila birligi topilmadi: " + id));
        return toResponse(unit);
    }

    @Transactional(readOnly = true)
    public List<FamilyUnitResponse> getByPersonId(Long personId) {
        List<FamilyUnit> asPartner = familyUnitRepository.findByPartnerIdWithRelations(personId);
        List<FamilyUnit> asChild = familyUnitRepository.findByChildIdWithRelations(personId);

        // Combine without duplicates
        java.util.LinkedHashMap<Long, FamilyUnit> map = new java.util.LinkedHashMap<>();
        asPartner.forEach(u -> map.put(u.getId(), u));
        asChild.forEach(u -> map.put(u.getId(), u));

        return map.values().stream().map(this::toResponse).collect(Collectors.toList());
    }

    private FamilyMember findMember(Long id) {
        return familyMemberRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Oila a'zosi topilmadi: " + id));
    }

    public FamilyUnitResponse toResponse(FamilyUnit unit) {
        FamilyUnitResponse r = new FamilyUnitResponse();
        r.setId(unit.getId());
        r.setMarriageType(unit.getMarriageType());
        r.setStatus(unit.getStatus());
        r.setMarriageDate(unit.getMarriageDate());
        r.setDivorceDate(unit.getDivorceDate());
        r.setPartners(mapPartners(unit));
        r.setChildren(mapChildren(unit));
        return r;
    }

    /**
     * FamilyUnit partnerlarini PartnerResponse ro'yxatiga (role, person id tartibida).
     * DRY — {@code toResponse} va {@code HouseholdTreeService} ikkalasi ishlatadi.
     */
    public List<PartnerResponse> mapPartners(FamilyUnit unit) {
        return unit.getPartners().stream()
                .filter(p -> isActiveMember(p.getPerson()))
                .sorted(Comparator
                        .comparing(FamilyPartner::getRole)
                        .thenComparing(p -> p.getPerson().getId()))
                .map(p -> {
                    PartnerResponse pr = new PartnerResponse();
                    pr.setId(p.getId());
                    pr.setPersonId(p.getPerson().getId());
                    pr.setFullName(p.getPerson().getFullName());
                    pr.setAvatar(p.getPerson().getAvatar());
                    pr.setGender(p.getPerson().getGender());
                    pr.setRole(p.getRole());
                    return pr;
                })
                .collect(Collectors.toList());
    }

    /**
     * FamilyUnit farzandlarini ChildResponse ro'yxatiga (birthOrder, birthDate, id tartibida).
     * DRY — {@code toResponse} va {@code HouseholdTreeService} ikkalasi ishlatadi.
     */
    public List<ChildResponse> mapChildren(FamilyUnit unit) {
        return unit.getChildren().stream()
                .filter(c -> isActiveMember(c.getPerson()))
                .sorted(Comparator
                        .comparing(FamilyChild::getBirthOrder, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(c -> c.getPerson().getBirthDate(), Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(c -> c.getPerson().getId()))
                .map(c -> {
                    ChildResponse cr = new ChildResponse();
                    cr.setId(c.getId());
                    cr.setPersonId(c.getPerson().getId());
                    cr.setFullName(c.getPerson().getFullName());
                    cr.setAvatar(c.getPerson().getAvatar());
                    cr.setGender(c.getPerson().getGender());
                    cr.setLineageType(c.getLineageType());
                    cr.setBirthOrder(c.getBirthOrder());
                    return cr;
                })
                .collect(Collectors.toList());
    }

    /** O'chirilgan (isActive=false) a'zolar FamilyUnit javobida ko'rsatilmaydi (daraxt bilan izchil). */
    private boolean isActiveMember(FamilyMember member) {
        return member != null && !Boolean.FALSE.equals(member.getIsActive());
    }
}
