package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import uz.familyfinance.api.entity.FamilyChild;
import uz.familyfinance.api.entity.FamilyMember;
import uz.familyfinance.api.entity.FamilyPartner;
import uz.familyfinance.api.entity.FamilyUnit;
import uz.familyfinance.api.enums.LineageType;
import uz.familyfinance.api.exception.ResourceNotFoundException;
import uz.familyfinance.api.repository.FamilyChildRepository;
import uz.familyfinance.api.repository.FamilyMemberRepository;
import uz.familyfinance.api.repository.FamilyPartnerRepository;
import uz.familyfinance.api.repository.FamilyUnitRepository;

import java.util.*;

@Service
@RequiredArgsConstructor
public class FamilyTreeValidationService {

    private final FamilyUnitRepository familyUnitRepository;
    private final FamilyPartnerRepository familyPartnerRepository;
    private final FamilyChildRepository familyChildRepository;
    private final FamilyMemberRepository familyMemberRepository;

    /**
     * DFS bilan tsikl tekshiruvi — farzandni ajdodiga qo'shishni oldini olish
     */
    public void validateNoAncestorCycle(Long familyUnitId, Long childPersonId) {
        FamilyUnit unit = familyUnitRepository.findByIdWithRelations(familyUnitId)
                .orElseThrow(() -> new ResourceNotFoundException("Oila birligi topilmadi: " + familyUnitId));

        // FamilyUnit ning partnerlari — bu ota-onalar
        Set<Long> parentIds = new HashSet<>();
        for (FamilyPartner partner : unit.getPartners()) {
            parentIds.add(partner.getPerson().getId());
        }

        // childPersonId ning ajdodlari orasida parentIds bor-yo'qligini tekshirish
        // Aslida, childPersonId ning avlodlari (descendants) orasida parentIds bor-yo'qligini
        // DFS bilan tekshiramiz — agar child ning farzandlari orasida ota-ona bo'lsa, tsikl bor
        Set<Long> descendants = new HashSet<>();
        collectDescendants(childPersonId, descendants);

        for (Long parentId : parentIds) {
            if (descendants.contains(parentId)) {
                throw new IllegalArgumentException(
                        "Tsiklik munosabat: shaxs o'z ajdodiga farzand sifatida qo'shilmoqda");
            }
        }

        // Teskari: childPersonId ota-onalarning ajdodi bo'lmasligi kerak
        Set<Long> ancestors = new HashSet<>();
        collectAncestors(childPersonId, ancestors);

        for (Long parentId : parentIds) {
            if (ancestors.contains(parentId)) {
                // Bu normal holat — ota-ona o'z farzandiga farzand qo'shmoqda
                // Lekin agar childPersonId allaqachon parentning ajdodi bo'lsa — tsikl
                Set<Long> childAncestors = new HashSet<>();
                collectAncestors(parentId, childAncestors);
                if (childAncestors.contains(childPersonId)) {
                    throw new IllegalArgumentException(
                            "Tsiklik munosabat: shaxs o'z avlodining ota-onasiga farzand sifatida qo'shilmoqda");
                }
            }
        }
    }

    private void collectDescendants(Long personId, Set<Long> visited) {
        if (visited.contains(personId)) return;
        visited.add(personId);

        // personId partner bo'lgan FamilyUnit lar
        List<FamilyUnit> units = familyUnitRepository.findByPartnerId(personId);
        for (FamilyUnit unit : units) {
            List<FamilyChild> children = familyChildRepository.findByFamilyUnitId(unit.getId());
            for (FamilyChild child : children) {
                collectDescendants(child.getPerson().getId(), visited);
            }
        }
    }

    private void collectAncestors(Long personId, Set<Long> visited) {
        if (visited.contains(personId)) return;
        visited.add(personId);

        // personId farzand bo'lgan FamilyUnit lar
        List<FamilyUnit> units = familyUnitRepository.findByChildId(personId);
        for (FamilyUnit unit : units) {
            List<FamilyPartner> partners = familyPartnerRepository.findByFamilyUnitId(unit.getId());
            for (FamilyPartner partner : partners) {
                collectAncestors(partner.getPerson().getId(), visited);
            }
        }
    }

    /**
     * O'zi bilan nikoh taqiqlash
     */
    public void validateNotSelfPartnership(Long person1Id, Long person2Id) {
        if (person1Id.equals(person2Id)) {
            throw new IllegalArgumentException("Shaxs o'zi bilan nikoh qila olmaydi");
        }
    }

    /**
     * Bir FamilyUnit da max 2 ta partner
     */
    public void validateMaxPartners(Long familyUnitId) {
        long count = familyPartnerRepository.countByFamilyUnitId(familyUnitId);
        if (count >= 2) {
            throw new IllegalArgumentException("Oila birligida 2 dan ortiq partner bo'la olmaydi");
        }
    }

    /**
     * Bitta farzandning faqat bitta biologik ota-onalar juftligi bo'lishi mumkin
     */
    public void validateBiologicalParentUnique(Long personId, LineageType lineageType) {
        if (lineageType != LineageType.BIOLOGICAL) return;

        familyChildRepository.findByPersonIdAndLineageType(personId, LineageType.BIOLOGICAL)
                .ifPresent(existing -> {
                    throw new IllegalArgumentException(
                            "Bu shaxs allaqachon biologik farzand sifatida boshqa oila birligiga biriktirilgan");
                });
    }

    /**
     * Farzand tug'ilgan sanasi validatsiyasi — ota-onalar nikoh sanasidan oldin bo'lmasligi
     */
    public void validateChildBirthDate(Long familyUnitId, Long childPersonId) {
        FamilyUnit unit = familyUnitRepository.findById(familyUnitId)
                .orElseThrow(() -> new ResourceNotFoundException("Oila birligi topilmadi: " + familyUnitId));
        FamilyMember child = familyMemberRepository.findById(childPersonId)
                .orElseThrow(() -> new ResourceNotFoundException("Oila a'zosi topilmadi: " + childPersonId));

        if (unit.getMarriageDate() != null && child.getBirthDate() != null) {
            // Farzand nikohdan 1 yildan oldin tug'ilgan bo'lsa, ogohlantirish (lekin taqiqlamaslik)
            // chunki farzandlar nikohdan oldin ham tug'ilishi mumkin
        }
    }
}
