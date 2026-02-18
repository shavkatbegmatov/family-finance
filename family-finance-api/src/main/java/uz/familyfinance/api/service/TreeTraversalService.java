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
        Long rootId = personId != null ? personId : resolveFamilyMemberId();

        FamilyMember root = familyMemberRepository.findById(rootId)
                .orElseThrow(() -> new ResourceNotFoundException("Oila a'zosi topilmadi: " + rootId));

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
            if (person == null) continue;
            if (!allPersons.stream().anyMatch(p -> p.getId().equals(currentPersonId))) {
                allPersons.add(person);
            }

            if (currentDepth >= maxDepth) continue;

            // 1. Person partner bo'lgan FamilyUnit lar (pastga ??? farzandlar)
            List<FamilyUnit> partnerUnits = familyUnitRepository.findByPartnerIdWithRelations(currentPersonId);
            for (FamilyUnit unit : partnerUnits) {
                if (visitedUnits.add(unit.getId())) {
                    allUnits.add(unit);
                }
                // Boshqa partnerni qo'shish
                for (FamilyPartner partner : unit.getPartners()) {
                    Long pid = partner.getPerson().getId();
                    if (visitedPersons.add(pid)) {
                        queue.add(new long[]{pid, currentDepth + 1});
                    }
                }
                // Farzandlarni qo'shish
                for (FamilyChild child : unit.getChildren()) {
                    Long cid = child.getPerson().getId();
                    if (visitedPersons.add(cid)) {
                        queue.add(new long[]{cid, currentDepth + 1});
                    }
                }
            }

            // 2. Person farzand bo'lgan FamilyUnit lar (yuqoriga ??? ota-onalar)
            List<FamilyUnit> childUnits = familyUnitRepository.findByChildIdWithRelations(currentPersonId);
            for (FamilyUnit unit : childUnits) {
                if (visitedUnits.add(unit.getId())) {
                    allUnits.add(unit);
                }
                // Ota-onalarni (partnerlarni) qo'shish
                for (FamilyPartner partner : unit.getPartners()) {
                    Long pid = partner.getPerson().getId();
                    if (visitedPersons.add(pid)) {
                        queue.add(new long[]{pid, currentDepth + 1});
                    }
                }
                // Aka-ukalarni qo'shish (boshqa farzandlar)
                for (FamilyChild sibling : unit.getChildren()) {
                    Long sid = sibling.getPerson().getId();
                    if (visitedPersons.add(sid)) {
                        queue.add(new long[]{sid, currentDepth + 1});
                    }
                }
            }
        }

        FamilyTreeV2Response response = new FamilyTreeV2Response();
        response.setRootPersonId(rootId);
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
    public FamilyTreeV2Response getAncestors(Long personId) {
        FamilyMember root = familyMemberRepository.findById(personId)
                .orElseThrow(() -> new ResourceNotFoundException("Oila a'zosi topilmadi: " + personId));

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
            if (person == null) continue;
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
            if (person == null) continue;
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
