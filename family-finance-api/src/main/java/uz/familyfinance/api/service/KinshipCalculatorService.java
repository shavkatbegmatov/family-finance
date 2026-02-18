package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.dto.response.*;
import uz.familyfinance.api.entity.*;
import uz.familyfinance.api.enums.Gender;
import uz.familyfinance.api.exception.ResourceNotFoundException;
import uz.familyfinance.api.repository.*;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class KinshipCalculatorService {

    private final FamilyMemberRepository familyMemberRepository;
    private final FamilyUnitRepository familyUnitRepository;
    private final FamilyPartnerRepository familyPartnerRepository;
    private final FamilyChildRepository familyChildRepository;

    /**
     * Ikki shaxs orasidagi munosabatni hisoblash
     */
    @Transactional(readOnly = true)
    public RelationshipResult calculateRelationship(Long viewerId, Long targetId) {
        if (viewerId.equals(targetId)) {
            return RelationshipResult.builder()
                    .viewerId(viewerId)
                    .targetId(targetId)
                    .relationshipLabel("Men")
                    .reverseLabel("Men")
                    .stepsUp(0)
                    .stepsDown(0)
                    .build();
        }

        // Juftlik tekshiruvi
        String spouseLabel = checkSpouseRelationship(viewerId, targetId);
        if (spouseLabel != null) {
            FamilyMember viewer = findMember(viewerId);
            String reverseSpouseLabel = checkSpouseRelationship(targetId, viewerId);
            return RelationshipResult.builder()
                    .viewerId(viewerId)
                    .targetId(targetId)
                    .relationshipLabel(spouseLabel)
                    .reverseLabel(reverseSpouseLabel != null ? reverseSpouseLabel : "Juftim")
                    .stepsUp(0)
                    .stepsDown(0)
                    .side("SPOUSE")
                    .build();
        }

        // Ajdodlar xaritasini tuzish
        Map<Long, Integer> viewerAncestors = buildAncestorMap(viewerId);
        Map<Long, Integer> targetAncestors = buildAncestorMap(targetId);

        // Umumiy ajdodni topish
        Long commonAncestorId = findCommonAncestor(viewerAncestors, targetAncestors);

        if (commonAncestorId == null) {
            // In-law (qayin) munosabatlarini tekshirish
            String inLawLabel = checkInLawRelationship(viewerId, targetId);
            if (inLawLabel != null) {
                String reverseInLaw = checkInLawRelationship(targetId, viewerId);
                return RelationshipResult.builder()
                        .viewerId(viewerId)
                        .targetId(targetId)
                        .relationshipLabel(inLawLabel)
                        .reverseLabel(reverseInLaw != null ? reverseInLaw : "Qarindosh")
                        .stepsUp(0)
                        .stepsDown(0)
                        .side("IN_LAW")
                        .build();
            }

            return RelationshipResult.builder()
                    .viewerId(viewerId)
                    .targetId(targetId)
                    .relationshipLabel("Qarindosh emas")
                    .reverseLabel("Qarindosh emas")
                    .build();
        }

        int stepsUp = viewerAncestors.get(commonAncestorId);
        int stepsDown = targetAncestors.get(commonAncestorId);

        FamilyMember target = findMember(targetId);
        FamilyMember viewer = findMember(viewerId);

        String side = determineSide(viewerId, commonAncestorId);

        boolean isElder = isElderSibling(viewerId, targetId);

        String label = mapToUzbekLabel(stepsUp, stepsDown, target.getGender(), side, isElder);
        String reverseLabel = mapToUzbekLabel(stepsDown, stepsUp, viewer.getGender(),
                determineSide(targetId, commonAncestorId), !isElder);

        return RelationshipResult.builder()
                .viewerId(viewerId)
                .targetId(targetId)
                .relationshipLabel(label)
                .reverseLabel(reverseLabel)
                .stepsUp(stepsUp)
                .stepsDown(stepsDown)
                .side(side)
                .build();
    }

    /**
     * Daraxtdagi barcha shaxslar uchun viewer ga nisbatan label berish
     */
    @Transactional(readOnly = true)
    public List<LabeledTreePersonDto> getLabeledTree(FamilyTreeV2Response tree, Long viewerId) {
        return tree.getPersons().stream().map(person -> {
            LabeledTreePersonDto labeled = new LabeledTreePersonDto();
            labeled.setId(person.getId());
            labeled.setFullName(person.getFullName());
            labeled.setFirstName(person.getFirstName());
            labeled.setLastName(person.getLastName());
            labeled.setMiddleName(person.getMiddleName());
            labeled.setRole(person.getRole());
            labeled.setGender(person.getGender());
            labeled.setBirthDate(person.getBirthDate());
            labeled.setBirthPlace(person.getBirthPlace());
            labeled.setDeathDate(person.getDeathDate());
            labeled.setPhone(person.getPhone());
            labeled.setAvatar(person.getAvatar());
            labeled.setIsActive(person.getIsActive());
            labeled.setUserId(person.getUserId());

            if (person.getId().equals(viewerId)) {
                labeled.setRelationshipLabel("Men");
            } else {
                try {
                    RelationshipResult result = calculateRelationship(viewerId, person.getId());
                    labeled.setRelationshipLabel(result.getRelationshipLabel());
                } catch (Exception e) {
                    labeled.setRelationshipLabel("Qarindosh");
                }
            }

            return labeled;
        }).collect(Collectors.toList());
    }

    /**
     * BFS bilan ajdodlar xaritasi ??? har bir ajdod uchun necha qadam yuqoriga ekanligini saqlash
     */
    private Map<Long, Integer> buildAncestorMap(Long personId) {
        Map<Long, Integer> ancestors = new HashMap<>();
        Queue<long[]> queue = new LinkedList<>();
        queue.add(new long[]{personId, 0});
        ancestors.put(personId, 0);

        while (!queue.isEmpty()) {
            long[] current = queue.poll();
            long currentId = current[0];
            int depth = (int) current[1];

            // Farzand bo'lgan FamilyUnit lar orqali ota-onalarga chiqish
            List<FamilyUnit> childUnits = familyUnitRepository.findByChildId(currentId);
            for (FamilyUnit unit : childUnits) {
                List<FamilyPartner> partners = familyPartnerRepository.findByFamilyUnitId(unit.getId());
                for (FamilyPartner partner : partners) {
                    Long parentId = partner.getPerson().getId();
                    if (!ancestors.containsKey(parentId)) {
                        ancestors.put(parentId, depth + 1);
                        queue.add(new long[]{parentId, depth + 1});
                    }
                }
            }
        }

        return ancestors;
    }

    /**
     * Eng yaqin umumiy ajdodni topish
     */
    private Long findCommonAncestor(Map<Long, Integer> viewerMap, Map<Long, Integer> targetMap) {
        Long bestAncestor = null;
        int bestTotal = Integer.MAX_VALUE;

        for (Map.Entry<Long, Integer> entry : viewerMap.entrySet()) {
            Long ancestorId = entry.getKey();
            if (targetMap.containsKey(ancestorId)) {
                int total = entry.getValue() + targetMap.get(ancestorId);
                if (total < bestTotal && total > 0) { // total > 0 bo'lsa o'zi emas
                    bestTotal = total;
                    bestAncestor = ancestorId;
                }
            }
        }

        return bestAncestor;
    }

    /**
     * OTA yoki ONA tomonini aniqlash
     */
    private String determineSide(Long personId, Long ancestorId) {
        if (personId.equals(ancestorId)) return null;

        // BFS bilan personId dan ancestorId gacha yo'l topish
        // va birinchi qadamdagi ota-onaning jinsini aniqlash
        Queue<Long> queue = new LinkedList<>();
        Map<Long, Long> parentMap = new HashMap<>();
        queue.add(personId);
        Set<Long> visited = new HashSet<>();
        visited.add(personId);

        while (!queue.isEmpty()) {
            Long currentId = queue.poll();

            if (currentId.equals(ancestorId)) {
                // Yo'l topildi ??? birinchi ota-onaning jinsini topish
                Long firstParentId = currentId;
                Long child = currentId;
                while (parentMap.containsKey(child)) {
                    firstParentId = child;
                    child = parentMap.get(child);
                }

                FamilyMember firstParent = familyMemberRepository.findById(firstParentId).orElse(null);
                if (firstParent != null && firstParent.getGender() != null) {
                    return firstParent.getGender() == Gender.MALE ? "OTA" : "ONA";
                }
                return null;
            }

            List<FamilyUnit> childUnits = familyUnitRepository.findByChildId(currentId);
            for (FamilyUnit unit : childUnits) {
                List<FamilyPartner> partners = familyPartnerRepository.findByFamilyUnitId(unit.getId());
                for (FamilyPartner partner : partners) {
                    Long parentId = partner.getPerson().getId();
                    if (visited.add(parentId)) {
                        parentMap.put(parentId, currentId);
                        queue.add(parentId);
                    }
                }
            }
        }

        return null;
    }

    /**
     * Kattami yoki kichikmi (aka-uka uchun)
     */
    private boolean isElderSibling(Long viewerId, Long targetId) {
        FamilyMember viewer = findMember(viewerId);
        FamilyMember target = findMember(targetId);

        if (viewer.getBirthDate() != null && target.getBirthDate() != null) {
            return target.getBirthDate().isBefore(viewer.getBirthDate());
        }
        return false;
    }

    /**
     * Juftlik (spouse) munosabatini tekshirish
     */
    private String checkSpouseRelationship(Long viewerId, Long targetId) {
        List<FamilyUnit> viewerUnits = familyUnitRepository.findByPartnerId(viewerId);
        for (FamilyUnit unit : viewerUnits) {
            List<FamilyPartner> partners = familyPartnerRepository.findByFamilyUnitId(unit.getId());
            for (FamilyPartner partner : partners) {
                if (partner.getPerson().getId().equals(targetId)) {
                    FamilyMember target = findMember(targetId);
                    if (target.getGender() == Gender.MALE) {
                        return "Erim";
                    } else if (target.getGender() == Gender.FEMALE) {
                        return "Xotinim";
                    }
                    return "Juftim";
                }
            }
        }
        return null;
    }

    /**
     * Qayin munosabatlarini tekshirish (spouse ning ota-onasi / farzandning jufti)
     */
    private String checkInLawRelationship(Long viewerId, Long targetId) {
        // 1. Target viewer ning juftining ota-onasimi? ??? Qayn ota/ona
        List<FamilyUnit> viewerSpouseUnits = familyUnitRepository.findByPartnerId(viewerId);
        for (FamilyUnit spouseUnit : viewerSpouseUnits) {
            List<FamilyPartner> partners = familyPartnerRepository.findByFamilyUnitId(spouseUnit.getId());
            for (FamilyPartner partner : partners) {
                if (!partner.getPerson().getId().equals(viewerId)) {
                    Long spouseId = partner.getPerson().getId();
                    // Spouse ning ota-onalarini tekshirish
                    List<FamilyUnit> spouseParentUnits = familyUnitRepository.findByChildId(spouseId);
                    for (FamilyUnit parentUnit : spouseParentUnits) {
                        List<FamilyPartner> parentPartners = familyPartnerRepository.findByFamilyUnitId(parentUnit.getId());
                        for (FamilyPartner parentPartner : parentPartners) {
                            if (parentPartner.getPerson().getId().equals(targetId)) {
                                FamilyMember target = findMember(targetId);
                                return target.getGender() == Gender.MALE ? "Qayn otam" : "Qayn onam";
                            }
                        }
                    }
                }
            }
        }

        // 2. Target viewer ning farzandining jufti mi? ??? Kuyov/Kelin
        List<FamilyUnit> viewerParentUnits = familyUnitRepository.findByPartnerId(viewerId);
        for (FamilyUnit parentUnit : viewerParentUnits) {
            List<FamilyChild> children = familyChildRepository.findByFamilyUnitId(parentUnit.getId());
            for (FamilyChild child : children) {
                Long childId = child.getPerson().getId();
                // Farzandning juftini tekshirish
                List<FamilyUnit> childSpouseUnits = familyUnitRepository.findByPartnerId(childId);
                for (FamilyUnit childSpouseUnit : childSpouseUnits) {
                    List<FamilyPartner> childPartners = familyPartnerRepository.findByFamilyUnitId(childSpouseUnit.getId());
                    for (FamilyPartner childPartner : childPartners) {
                        if (childPartner.getPerson().getId().equals(targetId)) {
                            FamilyMember target = findMember(targetId);
                            return target.getGender() == Gender.MALE ? "Kuyovim" : "Kelinim";
                        }
                    }
                }
            }
        }

        return null;
    }

    /**
     * O'zbek munosabat labelini aniqlash
     */
    private String mapToUzbekLabel(int stepsUp, int stepsDown, Gender gender, String side, boolean isElder) {
        boolean isMale = gender == Gender.MALE;

        // Ota-ona: up=1, down=0
        if (stepsUp == 1 && stepsDown == 0) {
            return isMale ? "Otam" : "Onam";
        }

        // Farzand: up=0, down=1
        if (stepsUp == 0 && stepsDown == 1) {
            return isMale ? "O'g'lim" : "Qizim";
        }

        // Aka-uka: up=1, down=1
        if (stepsUp == 1 && stepsDown == 1) {
            if (isMale) {
                return isElder ? "Akam" : "Ukam";
            } else {
                return isElder ? "Opam" : "Singlim";
            }
        }

        // Bobo-buvi: up=2, down=0
        if (stepsUp == 2 && stepsDown == 0) {
            return isMale ? "Bobom" : "Buvim";
        }

        // Nevara: up=0, down=2
        if (stepsUp == 0 && stepsDown == 2) {
            return isMale ? "Nevaram (o'g'il)" : "Nevaram (qiz)";
        }

        // Amaki/Amma yoki Tog'a/Xola: up=2, down=1
        if (stepsUp == 2 && stepsDown == 1) {
            if ("OTA".equals(side)) {
                return isMale ? "Ammakim" : "Ammam";
            } else if ("ONA".equals(side)) {
                return isMale ? "Tog'am" : "Xolam";
            }
            return isMale ? "Ammakim" : "Ammam";
        }

        // Jiyan: up=1, down=2
        if (stepsUp == 1 && stepsDown == 2) {
            return isMale ? "Jiyanim (o'g'il)" : "Jiyanim (qiz)";
        }

        // Probobo/probuvi: up=3, down=0
        if (stepsUp == 3 && stepsDown == 0) {
            return isMale ? "Probobo" : "Probuvi";
        }

        // Evar/Evara: up=0, down=3
        if (stepsUp == 0 && stepsDown == 3) {
            return isMale ? "Evaram (o'g'il)" : "Evaram (qiz)";
        }

        // Cousin (amakivachcha/tog'avachcha): up=2, down=2
        if (stepsUp == 2 && stepsDown == 2) {
            if ("OTA".equals(side)) {
                return isMale ? "Amakivachcha" : "Amakivachcha (qiz)";
            } else if ("ONA".equals(side)) {
                return isMale ? "Tog'avachcha" : "Tog'avachcha (qiz)";
            }
            return "Qarindosh";
        }

        // Uzoq munosabat
        if (stepsUp + stepsDown > 4) {
            return "Qarindosh";
        }

        return "Qarindosh";
    }

    private FamilyMember findMember(Long id) {
        return familyMemberRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Oila a'zosi topilmadi: " + id));
    }
}
