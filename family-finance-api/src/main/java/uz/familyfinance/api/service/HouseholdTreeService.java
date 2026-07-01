package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.dto.response.HouseholdEdgeDto;
import uz.familyfinance.api.dto.response.HouseholdNodeDto;
import uz.familyfinance.api.dto.response.HouseholdTreeResponse;
import uz.familyfinance.api.entity.FamilyChild;
import uz.familyfinance.api.entity.FamilyMember;
import uz.familyfinance.api.entity.FamilyPartner;
import uz.familyfinance.api.entity.FamilyUnit;
import uz.familyfinance.api.entity.Scope;
import uz.familyfinance.api.enums.ScopeType;
import uz.familyfinance.api.repository.FamilyMemberRepository;
import uz.familyfinance.api.repository.FamilyUnitRepository;
import uz.familyfinance.api.repository.ScopeRepository;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedList;
import java.util.List;
import java.util.Objects;
import java.util.Queue;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Xonadon-markazli oila daraxti servisi.
 *
 * <p>Tugun = bitta {@link FamilyUnit} (nikoh birligi: ota-ona + farzandlar) —
 * aynan vizual diagrammadagi har bir "xonadon" qutisi. Bir HOUSEHOLD scope'da bir
 * nechta FamilyUnit bo'lsa, har biri ALOHIDA tugun bo'ladi (birlashtirilmaydi).
 * {@code scopeId}/{@code displayCode} esa shu oila tegishli byudjet-xonadonni
 * bildiradi (UI'da bosilganda o'sha scope'ga o'tish uchun).</p>
 *
 * <p>Qirra = bir FamilyUnit farzandi boshqa FamilyUnit'da ota/ona (partner) bo'lganda
 * (turmush qurib yangi oila tashkil etgan).</p>
 *
 * <p>Shaxs-markazli {@link TreeTraversalService} dan ataylab AYRIM (Single
 * Responsibility). Xavfsizlik: faqat {@code getVisibleScopeIds()} ichidagi
 * HOUSEHOLD'larga tegishli unit'lar; qirralar faqat shu tugun-to'plam ichida.</p>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class HouseholdTreeService {

    /** Genealogik traversal chuqurligi — amalda butun bog'langan shajarani qamrab oladi. */
    private static final int DEFAULT_GENEALOGY_DEPTH = 25;

    private final ScopeRepository scopeRepository;
    private final FamilyUnitRepository familyUnitRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final FamilyUnitService familyUnitService;
    private final ScopeContextService scopeContext;
    private final TreeTraversalService treeTraversal;

    /**
     * Joriy user ko'rishi mumkin bo'lgan xonadonlar grafi.
     *
     * <p>Oddiy (oila a'zosiga bog'langan) user uchun graf "Shaxslar" daraxti bilan
     * IZCHIL quriladi: joriy a'zo bilan genealogik bog'langan barcha oilalar — ota-ona,
     * bobo-buvi, aka-uka va farzand xonadonlari — ko'rsatiladi (boshqa GROUP'da bo'lsa ham).
     * SUPER_ADMIN yoki hali oila a'zosiga bog'lanmagan user uchun esa scope-membership
     * asosidagi eski ko'rinishga qaytamiz.</p>
     */
    @Transactional(readOnly = true)
    public HouseholdTreeResponse getHouseholdTree() {
        Long rootMemberId = scopeContext.isSuperAdmin() ? null : currentMemberIdOrNull();
        if (rootMemberId == null) {
            return buildResponse(resolveVisibleHouseholds());
        }
        return buildResponseFromUnits(treeTraversal.collectConnectedUnits(rootMemberId, DEFAULT_GENEALOGY_DEPTH));
    }

    /** Joriy user'ning oila a'zosi ID'si, yoki bog'lanmagan bo'lsa {@code null}. */
    private Long currentMemberIdOrNull() {
        Long userId = scopeContext.getCurrentUserId();
        if (userId == null) {
            return null;
        }
        return familyMemberRepository.findByUserId(userId).map(FamilyMember::getId).orElse(null);
    }

    /** Bitta xonadondan boshlab {@code depth} darajagacha kengayuvchi graf. */
    @Transactional(readOnly = true)
    public HouseholdTreeResponse getHouseholdTreeFrom(Long scopeId, int depth) {
        if (!scopeContext.canViewScope(scopeId)) {
            throw new AccessDeniedException("Sizda bu xonadonni ko'rish ruxsati yo'q");
        }
        Set<Long> visibleIds = scopeContext.isSuperAdmin() ? null : scopeContext.getVisibleScopeIds();
        Set<Long> reachable = bfsReachableHouseholds(scopeId, depth, visibleIds);
        return buildResponse(scopeRepository.findByTypeAndIdInAndIsActiveTrue(ScopeType.HOUSEHOLD, reachable));
    }

    // ====================================================================
    // Tugunlarni aniqlash (visibility)
    // ====================================================================

    private List<Scope> resolveVisibleHouseholds() {
        if (scopeContext.isSuperAdmin()) {
            return scopeRepository.findByTypeAndIsActiveTrue(ScopeType.HOUSEHOLD);
        }
        Set<Long> visibleIds = scopeContext.getVisibleScopeIds();
        if (visibleIds.isEmpty()) {
            return List.of();
        }
        return scopeRepository.findByTypeAndIdInAndIsActiveTrue(ScopeType.HOUSEHOLD, visibleIds);
    }

    // ====================================================================
    // Javob qurish — har FamilyUnit alohida tugun
    // ====================================================================

    private HouseholdTreeResponse buildResponse(List<Scope> households) {
        List<FamilyUnit> units = new ArrayList<>();
        for (Scope household : households) {
            units.addAll(familyUnitRepository.findByScopeIdWithRelations(household.getId()));
        }
        return buildResponseFromUnits(units);
    }

    /** Berilgan FamilyUnit to'plamidan tugun va qirralarni quradi (qirralar shu to'plam ichida). */
    private HouseholdTreeResponse buildResponseFromUnits(List<FamilyUnit> units) {
        Set<Long> nodeUnitIds = units.stream().map(FamilyUnit::getId).collect(Collectors.toSet());

        List<HouseholdNodeDto> nodes = units.stream().map(this::buildNode).collect(Collectors.toList());

        List<HouseholdEdgeDto> edges = new ArrayList<>();
        Set<String> seenEdges = new HashSet<>();
        for (FamilyUnit unit : units) {
            collectEdges(unit, nodeUnitIds, edges, seenEdges);
        }

        HouseholdTreeResponse response = new HouseholdTreeResponse();
        response.setHouseholds(nodes);
        response.setEdges(edges);
        return response;
    }

    private HouseholdNodeDto buildNode(FamilyUnit unit) {
        Scope scope = unit.getScope();
        HouseholdNodeDto node = new HouseholdNodeDto();
        node.setFamilyUnitId(unit.getId());
        node.setScopeId(scope != null ? scope.getId() : null);
        node.setDisplayCode(scope != null ? scope.getDisplayCode() : null);
        node.setName(unitName(unit));
        node.setParents(familyUnitService.mapPartners(unit));
        node.setChildren(familyUnitService.mapChildren(unit));
        return node;
    }

    /** Oila nomi — birinchi partner (PARTNER1) ning to'liq ismi. */
    private String unitName(FamilyUnit unit) {
        return unit.getPartners().stream()
                .min(Comparator.comparing(FamilyPartner::getRole))
                .map(p -> p.getPerson().getFullName())
                .orElse("Oila");
    }

    /** Bu unit farzandi boshqa unit'da partner (ota/ona) bo'lsa → qirra. */
    private void collectEdges(FamilyUnit unit, Set<Long> nodeUnitIds,
                              List<HouseholdEdgeDto> edges, Set<String> seenEdges) {
        for (FamilyChild child : unit.getChildren()) {
            Long childPersonId = child.getPerson().getId();
            for (FamilyUnit partnerUnit : familyUnitRepository.findByPartnerId(childPersonId)) {
                Long toUnitId = partnerUnit.getId();
                if (Objects.equals(toUnitId, unit.getId()) || !nodeUnitIds.contains(toUnitId)) {
                    continue;
                }
                String key = unit.getId() + "->" + toUnitId + ":" + childPersonId;
                if (seenEdges.add(key)) {
                    edges.add(buildEdge(unit.getId(), toUnitId, childPersonId));
                }
            }
        }
    }

    private HouseholdEdgeDto buildEdge(Long fromUnitId, Long toUnitId, Long viaChildPersonId) {
        HouseholdEdgeDto edge = new HouseholdEdgeDto();
        edge.setFromUnitId(fromUnitId);
        edge.setToUnitId(toUnitId);
        edge.setViaChildPersonId(viaChildPersonId);
        return edge;
    }

    // ====================================================================
    // BFS — bitta xonadon (scope) dan kengayish (getHouseholdTreeFrom uchun)
    // ====================================================================

    private Set<Long> bfsReachableHouseholds(Long startScopeId, int depth, Set<Long> visibleIds) {
        Set<Long> visited = new HashSet<>();
        Queue<long[]> queue = new LinkedList<>();
        queue.add(new long[]{startScopeId, 0});
        visited.add(startScopeId);

        while (!queue.isEmpty()) {
            long[] current = queue.poll();
            long scopeId = current[0];
            int currentDepth = (int) current[1];
            if (currentDepth >= depth) {
                continue;
            }
            for (Long neighbor : neighborHouseholds(scopeId)) {
                if (isVisible(neighbor, visibleIds) && visited.add(neighbor)) {
                    queue.add(new long[]{neighbor, currentDepth + 1});
                }
            }
        }
        return visited;
    }

    /** {@code visibleIds == null} — SUPER_ADMIN (filtersiz). */
    private boolean isVisible(Long scopeId, Set<Long> visibleIds) {
        return visibleIds == null || visibleIds.contains(scopeId);
    }

    /** Berilgan xonadonning yuqori (ota-ona xonadoni) va past (farzand xonadoni) qo'shnilari. */
    private Set<Long> neighborHouseholds(Long scopeId) {
        Set<Long> neighbors = new HashSet<>();
        for (FamilyUnit unit : familyUnitRepository.findByScopeIdWithRelations(scopeId)) {
            for (FamilyChild child : unit.getChildren()) {
                addNeighborScopes(familyUnitRepository.findByPartnerId(child.getPerson().getId()), scopeId, neighbors);
            }
            for (FamilyPartner partner : unit.getPartners()) {
                addNeighborScopes(familyUnitRepository.findByChildId(partner.getPerson().getId()), scopeId, neighbors);
            }
        }
        return neighbors;
    }

    private void addNeighborScopes(List<FamilyUnit> relatedUnits, Long selfScopeId, Set<Long> neighbors) {
        for (FamilyUnit unit : relatedUnits) {
            Long scopeId = scopeIdOf(unit);
            if (scopeId != null && !Objects.equals(scopeId, selfScopeId)) {
                neighbors.add(scopeId);
            }
        }
    }

    private Long scopeIdOf(FamilyUnit unit) {
        return unit.getScope() != null ? unit.getScope().getId() : null;
    }
}
