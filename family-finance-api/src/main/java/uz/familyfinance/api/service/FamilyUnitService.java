package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.dto.request.AddChildRequest;
import uz.familyfinance.api.dto.request.AddPartnerRequest;
import uz.familyfinance.api.dto.request.CreateFamilyUnitRequest;
import uz.familyfinance.api.dto.request.UpdateFamilyUnitRequest;
import uz.familyfinance.api.dto.response.*;
import uz.familyfinance.api.entity.*;
import uz.familyfinance.api.enums.FamilyUnitStatus;
import uz.familyfinance.api.enums.LineageType;
import uz.familyfinance.api.enums.MarriageType;
import uz.familyfinance.api.enums.PartnerRole;
import uz.familyfinance.api.exception.ResourceNotFoundException;
import uz.familyfinance.api.repository.*;

import java.util.Comparator;
import java.util.List;
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
            validationService.validateNotSelfPartnership(request.getPartner1Id(), request.getPartner2Id());
            validationService.validateDuplicateMarriage(request.getPartner1Id(), request.getPartner2Id());
        }

        FamilyMember partner1 = findMember(request.getPartner1Id());

        FamilyUnit unit = FamilyUnit.builder()
                .marriageType(request.getMarriageType() != null ? request.getMarriageType() : MarriageType.MARRIED)
                .marriageDate(request.getMarriageDate())
                .status(FamilyUnitStatus.ACTIVE)
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

        r.setPartners(unit.getPartners().stream()
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
                .collect(Collectors.toList()));

        r.setChildren(unit.getChildren().stream()
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
                .collect(Collectors.toList()));

        return r;
    }
}
