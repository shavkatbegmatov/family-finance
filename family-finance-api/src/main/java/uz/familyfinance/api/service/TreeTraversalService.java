package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.dto.response.*;
import uz.familyfinance.api.entity.*;
import uz.familyfinance.api.exception.ResourceNotFoundException;
import uz.familyfinance.api.repository.*;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TreeTraversalService {

    private final FamilyMemberRepository familyMemberRepository;
    private final FamilyUnitRepository familyUnitRepository;
    private final FamilyPartnerRepository familyPartnerRepository;
    private final FamilyChildRepository familyChildRepository;
    private final UserRepository userRepository;
    private final FamilyUnitService familyUnitService;

    /**
     * BFS bilan ikki tomonga kengayish ??? yuqoriga (ota-onalar) va pastga (farzandlar)
     */
    @Transactional(readOnly = true)
    public FamilyTreeV2Response getTree(Long personId, int maxDepth) {
        Long effectiveRootId = resolveRoot(personId);
        TraversalResult result = traverseBidirectional(effectiveRootId, maxDepth);

        FamilyTreeV2Response response = new FamilyTreeV2Response();
        response.setRootPersonId(effectiveRootId);
        response.setPersons(result.persons().stream()
                .sorted(Comparator.comparing(FamilyMember::getId))
                .map(this::toMemberDto)
                .collect(Collectors.toList()));
        response.setFamilyUnits(result.units().stream()
                .sorted(Comparator.comparing(FamilyUnit::getId))
                .map(familyUnitService::toResponse)
                .collect(Collectors.toList()));

        return response;
    }

    /**
     * Joriy user (yoki berilgan shaxs) bilan genealogik bog'langan barcha nikoh
     * birliklari (FamilyUnit) — {@link #getTree} BFS bilan AYNAN bir xil traversal
     * (yuqori + quyi), scope/visibility filtrisiz. Xonadon-markazli ko'rinish shu
     * to'plamdan quriladi, shu sababli "Shaxslar" va "Xonadonlar" ko'rinishlari doim
     * bir xil oilani ko'rsatadi.
     */
    @Transactional(readOnly = true)
    public List<FamilyUnit> collectConnectedUnits(Long personId, int maxDepth) {
        return traverseBidirectional(resolveRoot(personId), maxDepth).units();
    }

    /**
     * Ildiz shaxsni aniqlaydi: berilgan {@code personId} (faol bo'lsa) yoki joriy
     * foydalanuvchining oila a'zosi (fallback). Berilgan shaxs faol bo'lmasa fallback'ga o'tadi.
     */
    private Long resolveRoot(Long personId) {
        Long fallbackRootId = resolveFamilyMemberId();
        Long effectiveRootId = personId != null ? personId : fallbackRootId;

        if (!isMemberActive(findMemberOrThrow(effectiveRootId))) {
            effectiveRootId = fallbackRootId;
            if (!isMemberActive(findMemberOrThrow(effectiveRootId))) {
                throw new ResourceNotFoundException("Faol oila a'zosi topilmadi: " + effectiveRootId);
            }
        }
        return effectiveRootId;
    }

    /**
     * Ikki tomonlama BFS: ildiz shaxsdan yuqoriga (ota-ona, ajdodlar) va pastga
     * (turmush o'rtoq, farzand, avlodlar) {@code maxDepth} chuqurlikgacha. Yo'lda
     * uchragan barcha faol shaxs va nikoh birligini to'playdi.
     */
    private TraversalResult traverseBidirectional(Long rootId, int maxDepth) {
        Set<Long> visitedPersons = new HashSet<>();
        Set<Long> visitedUnits = new HashSet<>();
        List<FamilyMember> allPersons = new ArrayList<>();
        List<FamilyUnit> allUnits = new ArrayList<>();

        // BFS queue: [personId, currentDepth]
        Queue<long[]> queue = new LinkedList<>();
        queue.add(new long[]{rootId, 0});
        visitedPersons.add(rootId);

        while (!queue.isEmpty()) {
            long[] current = queue.poll();
            long currentPersonId = current[0];
            int currentDepth = (int) current[1];

            FamilyMember person = familyMemberRepository.findById(currentPersonId).orElse(null);
            if (person == null || !isMemberActive(person)) continue;
            if (allPersons.stream().noneMatch(p -> p.getId().equals(currentPersonId))) {
                allPersons.add(person);
            }

            if (currentDepth >= maxDepth) continue;

            // Person partner bo'lgan birliklar (pastga — turmush o'rtoq + farzandlar) va
            // farzand bo'lgan birliklar (yuqoriga — ota-ona + aka-uka): ikkalasida ham
            // o'sha birlikning barcha partner va farzandlari navbatga qo'shiladi.
            collectUnits(familyUnitRepository.findByPartnerIdWithRelations(currentPersonId),
                    visitedUnits, allUnits, visitedPersons, queue, currentDepth);
            collectUnits(familyUnitRepository.findByChildIdWithRelations(currentPersonId),
                    visitedUnits, allUnits, visitedPersons, queue, currentDepth);
        }

        return new TraversalResult(allPersons, allUnits);
    }

    /** Topilgan birliklarni natijaga, ulardagi yangi (faol) shaxslarni esa BFS navbatiga qo'shadi. */
    private void collectUnits(List<FamilyUnit> units, Set<Long> visitedUnits, List<FamilyUnit> allUnits,
                              Set<Long> visitedPersons, Queue<long[]> queue, int currentDepth) {
        for (FamilyUnit unit : units) {
            if (visitedUnits.add(unit.getId())) {
                allUnits.add(unit);
            }
            unit.getPartners().forEach(p -> enqueueIfNew(p.getPerson(), visitedPersons, queue, currentDepth));
            unit.getChildren().forEach(c -> enqueueIfNew(c.getPerson(), visitedPersons, queue, currentDepth));
        }
    }

    /** Shaxs faol va hali ko'rilmagan bo'lsa BFS navbatiga (chuqurlik+1 bilan) qo'shadi. */
    private void enqueueIfNew(FamilyMember person, Set<Long> visitedPersons,
                             Queue<long[]> queue, int currentDepth) {
        if (!isMemberActive(person)) return;
        if (visitedPersons.add(person.getId())) {
            queue.add(new long[]{person.getId(), currentDepth + 1});
        }
    }

    /** {@link #traverseBidirectional} natijasi — to'plangan shaxs va nikoh birliklari. */
    private record TraversalResult(List<FamilyMember> persons, List<FamilyUnit> units) {}

    @Transactional(readOnly = true)
    public FamilyTreeV2Response getAncestors(Long personId) {
        FamilyMember root = familyMemberRepository.findById(personId)
                .orElseThrow(() -> new ResourceNotFoundException("Oila a'zosi topilmadi: " + personId));
        if (!isMemberActive(root)) {
            throw new ResourceNotFoundException("Faol oila a'zosi topilmadi: " + personId);
        }

        Set<Long> visitedPersons = new HashSet<>();
        Set<Long> visitedUnits = new HashSet<>();
        List<FamilyMember> allPersons = new ArrayList<>();
        List<FamilyUnit> allUnits = new ArrayList<>();

        Queue<Long> queue = new LinkedList<>();
        queue.add(personId);
        visitedPersons.add(personId);

        while (!queue.isEmpty()) {
            Long currentId = queue.poll();
            FamilyMember person = familyMemberRepository.findById(currentId).orElse(null);
            if (person == null || !isMemberActive(person)) continue;
            if (!allPersons.stream().anyMatch(p -> p.getId().equals(currentId))) {
                allPersons.add(person);
            }

            // Faqat yuqoriga ??? farzand bo'lgan unit lar
            List<FamilyUnit> childUnits = familyUnitRepository.findByChildIdWithRelations(currentId);
            for (FamilyUnit unit : childUnits) {
                if (visitedUnits.add(unit.getId())) {
                    allUnits.add(unit);
                }
                for (FamilyPartner partner : unit.getPartners()) {
                    if (!isMemberActive(partner.getPerson())) continue;
                    Long pid = partner.getPerson().getId();
                    if (visitedPersons.add(pid)) {
                        queue.add(pid);
                    }
                }
            }
        }

        FamilyTreeV2Response response = new FamilyTreeV2Response();
        response.setRootPersonId(personId);
        response.setPersons(allPersons.stream()
                .sorted(Comparator.comparing(FamilyMember::getId))
                .map(this::toMemberDto)
                .collect(Collectors.toList()));
        response.setFamilyUnits(allUnits.stream()
                .sorted(Comparator.comparing(FamilyUnit::getId))
                .map(familyUnitService::toResponse)
                .collect(Collectors.toList()));
        return response;
    }

    @Transactional(readOnly = true)
    public FamilyTreeV2Response getDescendants(Long personId) {
        FamilyMember root = familyMemberRepository.findById(personId)
                .orElseThrow(() -> new ResourceNotFoundException("Oila a'zosi topilmadi: " + personId));
        if (!isMemberActive(root)) {
            throw new ResourceNotFoundException("Faol oila a'zosi topilmadi: " + personId);
        }

        Set<Long> visitedPersons = new HashSet<>();
        Set<Long> visitedUnits = new HashSet<>();
        List<FamilyMember> allPersons = new ArrayList<>();
        List<FamilyUnit> allUnits = new ArrayList<>();

        Queue<Long> queue = new LinkedList<>();
        queue.add(personId);
        visitedPersons.add(personId);

        while (!queue.isEmpty()) {
            Long currentId = queue.poll();
            FamilyMember person = familyMemberRepository.findById(currentId).orElse(null);
            if (person == null || !isMemberActive(person)) continue;
            if (!allPersons.stream().anyMatch(p -> p.getId().equals(currentId))) {
                allPersons.add(person);
            }

            // Faqat pastga ??? partner bo'lgan unit lar
            List<FamilyUnit> partnerUnits = familyUnitRepository.findByPartnerIdWithRelations(currentId);
            for (FamilyUnit unit : partnerUnits) {
                if (visitedUnits.add(unit.getId())) {
                    allUnits.add(unit);
                }
                // Boshqa partnerni ham qo'shish
                for (FamilyPartner partner : unit.getPartners()) {
                    if (!isMemberActive(partner.getPerson())) continue;
                    Long pid = partner.getPerson().getId();
                    if (visitedPersons.add(pid)) {
                        // Partner qo'shiladi lekin uning farzandlari uchun BFS davom etmaydi
                        FamilyMember partnerMember = familyMemberRepository.findById(pid).orElse(null);
                        if (partnerMember != null) {
                            allPersons.add(partnerMember);
                        }
                    }
                }
                // Farzandlarni queue ga qo'shish
                for (FamilyChild child : unit.getChildren()) {
                    if (!isMemberActive(child.getPerson())) continue;
                    Long cid = child.getPerson().getId();
                    if (visitedPersons.add(cid)) {
                        queue.add(cid);
                    }
                }
            }
        }

        FamilyTreeV2Response response = new FamilyTreeV2Response();
        response.setRootPersonId(personId);
        response.setPersons(allPersons.stream()
                .sorted(Comparator.comparing(FamilyMember::getId))
                .map(this::toMemberDto)
                .collect(Collectors.toList()));
        response.setFamilyUnits(allUnits.stream()
                .sorted(Comparator.comparing(FamilyUnit::getId))
                .map(familyUnitService::toResponse)
                .collect(Collectors.toList()));
        return response;
    }

    public Long resolveFamilyMemberId() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Foydalanuvchi topilmadi"));

        FamilyMember member = familyMemberRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Profilingiz oila a'zosiga bog'lanmagan. Avval oila a'zosi yaratib, foydalanuvchi akkauntingizga bog'lang."));

        return member.getId();
    }

    private boolean isMemberActive(FamilyMember member) {
        return member != null && !Boolean.FALSE.equals(member.getIsActive());
    }

    private FamilyMember findMemberOrThrow(Long personId) {
        return familyMemberRepository.findById(personId)
                .orElseThrow(() -> new ResourceNotFoundException("Oila a'zosi topilmadi: " + personId));
    }

    private FamilyTreeMemberDto toMemberDto(FamilyMember m) {
        FamilyTreeMemberDto dto = new FamilyTreeMemberDto();
        dto.setId(m.getId());
        dto.setFullName(m.getFullName());
        dto.setFirstName(m.getFirstName());
        dto.setLastName(m.getLastName());
        dto.setMiddleName(m.getMiddleName());
        dto.setRole(m.getRole());
        dto.setGender(m.getGender());
        dto.setBirthDate(m.getBirthDate());
        dto.setBirthPlace(m.getBirthPlace());
        dto.setDeathDate(m.getDeathDate());
        dto.setPhone(m.getPhone());
        dto.setAvatar(m.getAvatar());
        dto.setIsActive(m.getIsActive());
        dto.setUserId(m.getUser() != null ? m.getUser().getId() : null);
        return dto;
    }
}
