import type { Gender, FamilyRole } from './index';

// ============ Enums ============
export type MarriageType = 'MARRIED' | 'DIVORCED' | 'PARTNERSHIP' | 'OTHER';
export type LineageType = 'BIOLOGICAL' | 'ADOPTED' | 'STEP' | 'FOSTER' | 'GUARDIAN';
export type FamilyUnitStatus = 'ACTIVE' | 'DISSOLVED';
export type PartnerRole = 'PARTNER1' | 'PARTNER2';

// ============ Person (from backend FamilyTreeMemberDto) ============
export interface TreePerson {
  id: number;
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

// ============ React Flow Node/Edge Data ============
export interface PersonNodeData {
  person: TreePerson;
  isRoot: boolean;
  label?: string;
}

export interface FamilyUnitNodeData {
  familyUnit: FamilyUnitDto;
}

export type FamilyEdgeType = 'marriage' | 'child';

// ============ Modal Types ============
export type FamilyTreeModal =
  | { type: 'addSpouse'; personId: number }
  | { type: 'addChild'; familyUnitId: number }
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
