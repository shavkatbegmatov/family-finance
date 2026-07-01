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
import uz.familyfinance.api.exception.BadRequestException;
import uz.familyfinance.api.exception.ConflictException;
import uz.familyfinance.api.exception.ResourceNotFoundException;
import uz.familyfinance.api.repository.*;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class FamilyUnitService {

    private final FamilyUnitRepository familyUnitRepository;
    private final FamilyPartnerRepository familyPartnerRepository;
    private final FamilyChildRepository familyChildRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final FamilyTreeValidationService validationService;

    @Transactional
    public FamilyUnitResponse createFamilyUnit(CreateFamilyUnitRequest request) {
        if (request.getPartner2Id() != null) {
            validationService.validatePartnerPair(request.getPartner1Id(), request.getPartner2Id());
        }

        FamilyMember partner1 = findMember(request.getPartner1Id());

        // Genealogiya moliyadan mustaqil — yangi nikoh byudjet-xonadonga (scope) avtomatik
        // bog'lanmaydi. Xonadon kerak bo'lsa alohida biriktiriladi (FamilyUnit.scope ixtiyoriy).
        FamilyUnit saved = familyUnitRepository.save(FamilyUnit.builder()
                .marriageType(request.getMarriageType() != null ? request.getMarriageType() : MarriageType.MARRIED)
                .marriageDate(request.getMarriageDate())
                .status(FamilyUnitStatus.ACTIVE)
                .build());

        attachPartner(saved, partner1);
        if (request.getPartner2Id() != null) {
            attachPartner(saved, findMember(request.getPartner2Id()));
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

        // Genealogiya moliyadan mustaqil — ota-ona nikohi byudjet-xonadonga avtomatik bog'lanmaydi.
        FamilyMember father = resolveOrCreateParent(request.getFatherId(), request.getFatherFirstName(),
                Gender.MALE, FamilyRole.FATHER, request.getFatherBirthDate());
        FamilyMember mother = resolveOrCreateParent(request.getMotherId(), request.getMotherFirstName(),
                Gender.FEMALE, FamilyRole.MOTHER, request.getMotherBirthDate());

        validationService.validatePartnerPair(father.getId(), mother.getId());

        FamilyUnit saved = familyUnitRepository.save(FamilyUnit.builder()
                .marriageType(request.getMarriageType() != null ? request.getMarriageType() : MarriageType.MARRIED)
                .marriageDate(request.getMarriageDate())
                .status(FamilyUnitStatus.ACTIVE)
                .build());

        attachPartner(saved, father);
        attachPartner(saved, mother);

        // Farzandni biriktirish — addChild logikasi (cycle/duplikat/biologik validatsiyalar bilan) qayta ishlatiladi
        AddChildRequest childReq = new AddChildRequest();
        childReq.setPersonId(child.getId());
        childReq.setLineageType(LineageType.BIOLOGICAL);
        return addChild(saved.getId(), childReq);
    }

    private FamilyMember resolveOrCreateParent(Long existingId, String firstName, Gender gender,
                                               FamilyRole role, LocalDate birthDate) {
        if (existingId != null) {
            return findMember(existingId);
        }
        FamilyMember parent = FamilyMember.builder()
                .firstName(firstName != null ? firstName.trim() : null)
                .gender(gender)
                .role(role)
                .birthDate(birthDate)
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
        // Joy qolmagan bo'lsa jim o'tkazib yuboramiz (yetishmayotganini qo'shish — best-effort)
        if (familyPartnerRepository.countByFamilyUnitId(unit.getId()) >= FamilyTreeValidationService.MAX_PARTNERS_PER_UNIT) {
            return;
        }
        FamilyMember parent = resolveOrCreateParent(existingId, firstName, gender, role, birthDate);
        attachPartner(unit, parent);
    }

    /**
     * Shaxsni oila birligiga partner sifatida qo'shadi — rol (PARTNER1/PARTNER2) bo'sh o'ringa
     * qarab avtomatik tanlanadi, birlik to'lgan bo'lsa xato beradi. DRY — barcha partner qo'shish
     * amallari (createFamilyUnit, addParents, addSpouse, addPartner) shu yagona yo'ldan o'tadi.
     */
    private FamilyPartner attachPartner(FamilyUnit unit, FamilyMember person) {
        long count = familyPartnerRepository.countByFamilyUnitId(unit.getId());
        if (count >= FamilyTreeValidationService.MAX_PARTNERS_PER_UNIT) {
            throw new BadRequestException("Oila birligida "
                    + FamilyTreeValidationService.MAX_PARTNERS_PER_UNIT + " tadan ortiq partner bo'la olmaydi");
        }
        PartnerRole role = count == 0 ? PartnerRole.PARTNER1 : PartnerRole.PARTNER2;
        return familyPartnerRepository.save(FamilyPartner.builder()
                .familyUnit(unit).person(person).role(role).build());
    }

    /** Shaxs allaqachon shu oila birligida partner bo'lsa konflikt xatosi beradi. */
    private void ensureNotAlreadyPartner(Long familyUnitId, Long personId) {
        familyPartnerRepository.findByFamilyUnitIdAndPersonId(familyUnitId, personId)
                .ifPresent(existing -> {
                    throw new ConflictException("Bu shaxs allaqachon oila birligida partner");
                });
    }

    /** Shaxs allaqachon shu oila birligida farzand bo'lsa konflikt xatosi beradi. */
    private void ensureNotAlreadyChild(Long familyUnitId, Long personId) {
        familyChildRepository.findByFamilyUnitIdAndPersonId(familyUnitId, personId)
                .ifPresent(existing -> {
                    throw new ConflictException("Bu shaxs allaqachon oila birligida farzand");
                });
    }

    /**
     * Oila a'zosini genealogik bog'lanishlardan butunlay uzadi — a'zo o'chirilganda (soft-delete)
     * {@link FamilyMemberService#delete} tomonidan chaqiriladi. A'zoning barcha partner va farzand
     * bog'lanishlari o'chiriladi; so'ng tirik partner ham, farzand ham qolmagan oila birliklari
     * cascade bilan o'chadi. Shu tufayli yetim (ota-onasiz) bog'lanishlar umuman qolmaydi.
     */
    @Transactional
    public void detachMemberFromGenealogy(Long memberId) {
        Set<Long> affectedUnitIds = new LinkedHashSet<>();

        List<FamilyChild> childLinks = familyChildRepository.findByPersonId(memberId);
        childLinks.forEach(link -> affectedUnitIds.add(link.getFamilyUnit().getId()));
        familyChildRepository.deleteAll(childLinks);

        List<FamilyPartner> partnerLinks = familyPartnerRepository.findByPersonId(memberId);
        partnerLinks.forEach(link -> affectedUnitIds.add(link.getFamilyUnit().getId()));
        familyPartnerRepository.deleteAll(partnerLinks);

        // O'chirilgan bog'lanishlar quyidagi bo'shliq tekshiruvida ko'rinmasligi uchun darhol flush
        familyChildRepository.flush();
        familyPartnerRepository.flush();

        affectedUnitIds.forEach(this::deleteUnitIfEmpty);
    }

    /** Oila birligida tirik partner ham, farzand ham qolmagan bo'lsa — uni (cascade bilan) o'chiradi. */
    private void deleteUnitIfEmpty(Long unitId) {
        boolean hasLivingPartner = familyPartnerRepository.findByFamilyUnitId(unitId).stream()
                .anyMatch(this::isLivingPartner);
        boolean hasChild = !familyChildRepository.findByFamilyUnitId(unitId).isEmpty();
        if (!hasLivingPartner && !hasChild) {
            familyUnitRepository.findById(unitId).ifPresent(familyUnitRepository::delete);
        }
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
            // Yangi turmush o'rtoq — sof genealogik shaxs, byudjet-xonadonga bog'lanmaydi.
            spouse = familyMemberRepository.save(FamilyMember.builder()
                    .firstName(request.getSpouseFirstName() != null ? request.getSpouseFirstName().trim() : null)
                    .lastName(request.getSpouseLastName())
                    .middleName(request.getSpouseMiddleName())
                    .gender(request.getSpouseGender())
                    .role(FamilyRole.OTHER)
                    .birthDate(request.getSpouseBirthDate())
                    .build());
        }

        validationService.validatePartnerPair(person.getId(), spouse.getId());

        if (singleUnit.isPresent()) {
            FamilyUnit unit = singleUnit.get();
            if (request.getMarriageType() != null) {
                unit.setMarriageType(request.getMarriageType());
            }
            if (request.getMarriageDate() != null) {
                unit.setMarriageDate(request.getMarriageDate());
            }
            familyUnitRepository.save(unit);
            attachPartner(unit, spouse);
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

        ensureNotAlreadyPartner(familyUnitId, request.getPersonId());

        // Mavjud har bir partner bilan o'zi-bilan/dublikat nikoh tekshiruvi
        for (FamilyPartner existingPartner : unit.getPartners()) {
            validationService.validatePartnerPair(existingPartner.getPerson().getId(), request.getPersonId());
        }

        attachPartner(unit, person);
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

        ensureNotAlreadyChild(familyUnitId, request.getPersonId());

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
