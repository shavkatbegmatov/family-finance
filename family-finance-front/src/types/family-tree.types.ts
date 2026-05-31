import type { Gender, FamilyRole } from './index';

// ============ Enums ============
export type MarriageType = 'MARRIED' | 'DIVORCED' | 'PARTNERSHIP' | 'OTHER';
export type LineageType = 'BIOLOGICAL' | 'ADOPTED' | 'STEP' | 'FOSTER' | 'GUARDIAN';
export type FamilyUnitStatus = 'ACTIVE' | 'DISSOLVED';
export type PartnerRole = 'PARTNER1' | 'PARTNER2';

// ============ Person (from backend FamilyTreeMemberDto) ============
export interface TreePerson {
  id: number;
  firstName: string;
  middleName?: string;
  fullName: string;
  lastName?: string;
  role: FamilyRole;
  gender?: Gender;
  birthDate?: string;
  birthPlace?: string;
  deathDate?: string;
  phone?: string;
  avatar?: string;
  isActive: boolean;
  userId?: number;
  relationshipLabel?: string; // from LabeledTreePersonDto
}

// ============ FamilyUnit ============
export interface PartnerDto {
  id: number;
  personId: number;
  fullName: string;
  avatar?: string;
  gender?: Gender;
  role: PartnerRole;
}

export interface ChildDto {
  id: number;
  personId: number;
  fullName: string;
  avatar?: string;
  gender?: Gender;
  lineageType: LineageType;
  birthOrder?: number;
}

export interface FamilyUnitDto {
  id: number;
  marriageType: MarriageType;
  status: FamilyUnitStatus;
  marriageDate?: string;
  divorceDate?: string;
  partners: PartnerDto[];
  children: ChildDto[];
}

// ============ Tree Response ============
export interface TreeResponse {
  rootPersonId: number;
  persons: TreePerson[];
  familyUnits: FamilyUnitDto[];
}

// ============ Household Tree (xonadon-markazli) ============
export interface HouseholdNodeDto {
  familyUnitId: number;
  scopeId?: number;
  displayCode?: string;
  name: string;
  parents: PartnerDto[];
  children: ChildDto[];
}

export interface HouseholdEdgeDto {
  fromUnitId: number;
  toUnitId: number;
  viaChildPersonId: number;
}

export interface HouseholdTreeResponse {
  households: HouseholdNodeDto[];
  edges: HouseholdEdgeDto[];
}

// React Flow node data (xonadon tuguni)
export interface HouseholdNodeData {
  household: HouseholdNodeDto;
}

// ============ Relationship ============
export interface RelationshipResult {
  viewerId: number;
  targetId: number;
  relationshipLabel: string;
  reverseLabel: string;
  stepsUp: number;
  stepsDown: number;
  side?: string;
}

// ============ Requests ============
export interface CreateFamilyUnitRequest {
  partner1Id: number;
  partner2Id?: number;
  marriageType?: MarriageType;
  marriageDate?: string;
}

export interface UpdateFamilyUnitRequest {
  marriageType?: MarriageType;
  status?: FamilyUnitStatus;
  marriageDate?: string;
  divorceDate?: string;
}

export interface AddPartnerRequest {
  personId: number;
}

export interface AddChildRequest {
  personId: number;
  lineageType?: LineageType;
  birthOrder?: number;
}

export interface AddParentsRequest {
  childPersonId: number;
  fatherId?: number;
  fatherFirstName?: string;
  fatherBirthDate?: string;
  motherId?: number;
  motherFirstName?: string;
  motherBirthDate?: string;
  marriageType?: MarriageType;
  marriageDate?: string;
}

export interface AddSpouseRequest {
  personId: number;
  spouseId?: number;
  spouseFirstName?: string;
  spouseLastName?: string;
  spouseMiddleName?: string;
  spouseGender?: Gender;
  spouseBirthDate?: string;
  marriageType?: MarriageType;
  marriageDate?: string;
}

// ============ React Flow Node/Edge Data ============
export interface PersonNodeData {
  person: TreePerson;
  isRoot: boolean;
  label?: string;
  hasSubTree?: boolean;
}

export interface FamilyUnitNodeData {
  familyUnit: FamilyUnitDto;
  variant?: 'pair' | 'bus';
}

export type FamilyEdgeType = 'marriage' | 'child';

export type FamilyEdgeKind = 'marriage' | 'child' | 'trunk';

export interface EdgeRoutePoint {
  x: number;
  y: number;
}

export interface EdgeBridgePoint {
  x: number;
  y: number;
  segmentIndex: number;
}

export interface EdgeJunctionPoint {
  x: number;
  y: number;
  segmentIndex: number;
}

export interface EdgeSectionPoint {
  x: number;
  y: number;
}

export interface EdgeSectionData {
  id?: string;
  startPoint: EdgeSectionPoint;
  endPoint: EdgeSectionPoint;
  bendPoints?: EdgeSectionPoint[];
}

export interface FamilyEdgeRenderData extends Record<string, unknown> {
  edgeKind?: FamilyEdgeKind;
  familyUnitId?: number;
  laneIndex?: number;
  laneCount?: number;
  routePoints?: EdgeRoutePoint[];
  elkSections?: EdgeSectionData[];
  routingSource?: 'elk' | 'fallback' | 'obstacle-aware';
  bridges?: EdgeBridgePoint[];
  junctions?: EdgeJunctionPoint[];
}

export interface MarriageEdgeData extends FamilyEdgeRenderData {
  marriageType?: MarriageType;
  status?: FamilyUnitStatus;
}

export interface ChildEdgeData extends FamilyEdgeRenderData {
  lineageType?: LineageType;
}

// ============ Modal Types ============
export type FamilyTreeModal =
  | { type: 'addSpouse'; personId: number }
  | { type: 'addChild'; familyUnitId?: number; singleParentPersonId?: number; isSibling?: boolean }
  | { type: 'addSibling'; personId: number }
  | { type: 'selectFamilyUnit'; personId: number }
  | { type: 'editPerson'; personId: number }
  | { type: 'editFamilyUnit'; familyUnitId: number }
  | { type: 'deletePerson'; personId: number; personName: string }
  | { type: 'deleteFamilyUnit'; familyUnitId: number }
  | { type: 'personDetail'; personId: number }
  | { type: 'addParents'; personId: number }
  | { type: 'createAccount'; personId: number; personName: string }
  | null;
