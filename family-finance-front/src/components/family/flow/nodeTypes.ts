import { FamilyMemberNode } from './FamilyMemberNode';
import { ParentChildEdge } from './edges/ParentChildEdge';
import { SpouseEdge } from './edges/SpouseEdge';
import { SiblingEdge } from './edges/SiblingEdge';

export const nodeTypes = {
  familyMember: FamilyMemberNode,
};

export const edgeTypes = {
  parentChild: ParentChildEdge,
  spouse: SpouseEdge,
  sibling: SiblingEdge,
};
