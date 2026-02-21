import { PersonNode } from './nodes/PersonNode';
import { FamilyUnitNode } from './nodes/FamilyUnitNode';
import { MarriageEdge } from './edges/MarriageEdge';
import { ChildEdge } from './edges/ChildEdge';
import { RelativesTreeEdge } from './edges/RelativesTreeEdge';

export const nodeTypes = {
  personNode: PersonNode,
  familyUnitNode: FamilyUnitNode,
};

export const edgeTypes = {
  marriageEdge: MarriageEdge,
  childEdge: ChildEdge,
  relativesTreeEdge: RelativesTreeEdge,
};
