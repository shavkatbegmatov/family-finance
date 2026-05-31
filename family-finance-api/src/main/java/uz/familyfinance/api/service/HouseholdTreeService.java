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
import uz.familyfinance.api.entity.FamilyPartner;
import uz.familyfinance.api.entity.FamilyUnit;
import uz.familyfinance.api.entity.Scope;
import uz.familyfinance.api.enums.ScopeType;
import uz.familyfinance.api.repository.FamilyUnitRepository;
import uz.familyfinance.api.repository.ScopeRepository;

import java.util.ArrayList;
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
 * <p>Tugun = HOUSEHOLD scope (ichida bir yoki bir nechta {@link FamilyUnit}),
 * qirra = bir xonadon farzandi boshqa xonadonda ota/ona (partner) bo'lganda.</p>
 *
 * <p>Shaxs-markazli {@link TreeTraversalService} dan ataylab AYRIM: u yerda tugun
 * shaxs, bu yerda tugun xonadon — semantika boshqacha (Single Responsibility).</p>
 *
 * <p>Xavfsizlik: tugunlar faqat {@code getVisibleScopeIds()} ichidagi HOUSEHOLD'lar;
 * qirralar faqat shu tugun-to'plam ichida bog'lanadi (cross-tenant leak himoyasi).</p>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class HouseholdTreeService {

    private final ScopeRepository scopeRepository;
    private final FamilyUnitRepository familyUnitRepository;
    private final FamilyUnitService familyUnitService;
    private final ScopeContextService scopeContext;

    /** Joriy user ko'ra oladigan barcha xonadonlar grafi. */
    @Transactional(readOnly = true)
    public HouseholdTreeResponse getHouseholdTree() {
        return buildResponse(resolveVisibleHouseholds());
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
    // Javob qurish (tugun + qirra)
    // ====================================================================

    private HouseholdTreeResponse buildResponse(List<Scope> households) {
        Set<Long> nodeScopeIds = households.stream().map(Scope::getId).collect(Collectors.toSet());

        List<HouseholdNodeDto> nodes = new ArrayList<>();
        List<HouseholdEdgeDto> edges = new ArrayList<>();
        Set<String> seenEdges = new HashSet<>();

        for (Scope household : households) {
            List<FamilyUnit> units = familyUnitRepository.findByScopeIdWithRelations(household.getId());
            nodes.add(buildNode(household, units));
            collectEdges(household.getId(), units, nodeScopeIds, edges, seenEdges);
        }

        HouseholdTreeResponse response = new HouseholdTreeResponse();
        response.setHouseholds(nodes);
        response.setEdges(edges);
        return response;
    }

    private HouseholdNodeDto buildNode(Scope household, List<FamilyUnit> units) {
        HouseholdNodeDto node = new HouseholdNodeDto();
        node.setScopeId(household.getId());
        node.setDisplayCode(household.getDisplayCode());
        node.setName(household.getName());
        node.setFamilyUnitIds(units.stream().map(FamilyUnit::getId).collect(Collectors.toList()));
        node.setParents(units.stream()
                .flatMap(u -> familyUnitService.mapPartners(u).stream())
                .collect(Collectors.toList()));
        node.setChildren(units.stream()
                .flatMap(u -> familyUnitService.mapChildren(u).stream())
                .collect(Collectors.toList()));
        return node;
    }

    private void collectEdges(Long fromScopeId, List<FamilyUnit> units, Set<Long> nodeScopeIds,
                              List<HouseholdEdgeDto> edges, Set<String> seenEdges) {
        for (FamilyUnit unit : units) {
            for (FamilyChild child : unit.getChildren()) {
                addEdgesForChild(fromScopeId, child.getPerson().getId(), nodeScopeIds, edges, seenEdges);
            }
        }
    }

    private void addEdgesForChild(Long fromScopeId, Long childPersonId, Set<Long> nodeScopeIds,
                                  List<HouseholdEdgeDto> edges, Set<String> seenEdges) {
        for (FamilyUnit partnerUnit : familyUnitRepository.findByPartnerId(childPersonId)) {
            Long toScopeId = scopeIdOf(partnerUnit);
            if (toScopeId == null || Objects.equals(toScopeId, fromScopeId) || !nodeScopeIds.contains(toScopeId)) {
                continue;
            }
            String key = fromScopeId + "->" + toScopeId + ":" + childPersonId;
            if (seenEdges.add(key)) {
                edges.add(buildEdge(fromScopeId, toScopeId, childPersonId));
            }
        }
    }

    private HouseholdEdgeDto buildEdge(Long fromScopeId, Long toScopeId, Long viaChildPersonId) {
        HouseholdEdgeDto edge = new HouseholdEdgeDto();
        edge.setFromScopeId(fromScopeId);
        edge.setToScopeId(toScopeId);
        edge.setViaChildPersonId(viaChildPersonId);
        return edge;
    }

    // ====================================================================
    // BFS — bitta xonadondan kengayish
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
