package uz.familyfinance.api.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.familyfinance.api.dto.response.*;
import uz.familyfinance.api.enums.PermissionCode;
import uz.familyfinance.api.security.RequiresPermission;
import uz.familyfinance.api.service.KinshipCalculatorService;
import uz.familyfinance.api.service.TreeTraversalService;

import java.util.List;

@RestController
@RequestMapping("/v1/family-tree")
@RequiredArgsConstructor
public class FamilyTreeController {

    private final TreeTraversalService treeTraversalService;
    private final KinshipCalculatorService kinshipCalculatorService;

    @GetMapping
    @RequiresPermission(PermissionCode.FAMILY_VIEW)
    public ResponseEntity<ApiResponse<FamilyTreeV2Response>> getTree(
            @RequestParam(required = false) Long personId,
            @RequestParam(defaultValue = "5") int depth) {
        return ResponseEntity.ok(ApiResponse.success(treeTraversalService.getTree(personId, depth)));
    }

    @GetMapping("/{personId}/ancestors")
    @RequiresPermission(PermissionCode.FAMILY_VIEW)
    public ResponseEntity<ApiResponse<FamilyTreeV2Response>> getAncestors(@PathVariable Long personId) {
        return ResponseEntity.ok(ApiResponse.success(treeTraversalService.getAncestors(personId)));
    }

    @GetMapping("/{personId}/descendants")
    @RequiresPermission(PermissionCode.FAMILY_VIEW)
    public ResponseEntity<ApiResponse<FamilyTreeV2Response>> getDescendants(@PathVariable Long personId) {
        return ResponseEntity.ok(ApiResponse.success(treeTraversalService.getDescendants(personId)));
    }

    @GetMapping("/relationship")
    @RequiresPermission(PermissionCode.FAMILY_VIEW)
    public ResponseEntity<ApiResponse<RelationshipResult>> getRelationship(
            @RequestParam Long viewer, @RequestParam Long target) {
        return ResponseEntity.ok(ApiResponse.success(kinshipCalculatorService.calculateRelationship(viewer, target)));
    }

    @GetMapping("/{personId}/labeled")
    @RequiresPermission(PermissionCode.FAMILY_VIEW)
    public ResponseEntity<ApiResponse<FamilyTreeV2Response>> getLabeledTree(
            @PathVariable Long personId,
            @RequestParam Long viewer,
            @RequestParam(defaultValue = "5") int depth) {
        FamilyTreeV2Response tree = treeTraversalService.getTree(personId, depth);
        List<LabeledTreePersonDto> labeledPersons = kinshipCalculatorService.getLabeledTree(tree, viewer);

        FamilyTreeV2Response response = new FamilyTreeV2Response();
        response.setRootPersonId(tree.getRootPersonId());
        // LabeledTreePersonDto extends FamilyTreeMemberDto, so cast safely
        response.setPersons(labeledPersons.stream()
                .map(p -> (FamilyTreeMemberDto) p)
                .collect(java.util.stream.Collectors.toList()));
        response.setFamilyUnits(tree.getFamilyUnits());
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
