import { useMemo } from 'react';
import type { FamilyTreeResponse, FamilyTreeMember, FamilyRelationshipDto } from '../types';

// Layout konstantlari
const CARD_WIDTH = 176;
const CARD_HEIGHT = 160;
const CARD_WIDTH_COMPACT = 144;
const CARD_HEIGHT_COMPACT = 136;
const H_GAP = 24;
const V_GAP = 100;
const COUPLE_GAP = 16;

export interface TreeNode {
  memberId: number;
  member: FamilyTreeMember;
  relationship?: FamilyRelationshipDto;
  x: number;
  y: number;
  generation: number;
  isRoot: boolean;
  coupleWith?: number;
  size: 'normal' | 'compact';
}

export interface TreeEdge {
  fromId: number;
  toId: number;
  type: 'parent-child' | 'spouse' | 'sibling';
}

export interface TreeLayout {
  nodes: TreeNode[];
  edges: TreeEdge[];
  width: number;
  height: number;
  rootNode: TreeNode | null;
  overflowRelationships: Array<{
    category: string;
    relationships: FamilyRelationshipDto[];
  }>;
}

// Avlod (generation) aniqlash
function getGeneration(category: string): number {
  switch (category) {
    case 'grandparents': return -2;
    case 'parents': return -1;
    case 'siblings': return 0;
    case 'spouse': return 0;
    case 'children': return 1;
    case 'grandchildren': return 2;
    default: return 999; // overflow
  }
}

function isCompactGeneration(gen: number): boolean {
  return gen === -2 || gen === 2;
}

function getCardDimensions(gen: number): { w: number; h: number } {
  if (isCompactGeneration(gen)) {
    return { w: CARD_WIDTH_COMPACT, h: CARD_HEIGHT_COMPACT };
  }
  return { w: CARD_WIDTH, h: CARD_HEIGHT };
}

export function useTreeLayout(treeData: FamilyTreeResponse | null): TreeLayout {
  return useMemo(() => {
    if (!treeData || treeData.members.length === 0) {
      return { nodes: [], edges: [], width: 0, height: 0, rootNode: null, overflowRelationships: [] };
    }

    const membersMap = new Map<number, FamilyTreeMember>();
    treeData.members.forEach(m => membersMap.set(m.id, m));

    const rootMember = membersMap.get(treeData.rootMemberId);
    if (!rootMember) {
      return { nodes: [], edges: [], width: 0, height: 0, rootNode: null, overflowRelationships: [] };
    }

    // Munosabatlarni category bo'yicha guruhlash
    const grouped = new Map<string, FamilyRelationshipDto[]>();
    treeData.relationships.forEach(rel => {
      const cat = rel.category;
      if (!grouped.has(cat)) grouped.set(cat, []);
      grouped.get(cat)!.push(rel);
    });

    // Avlodlar
    const generationMap = new Map<number, Array<{ memberId: number; rel?: FamilyRelationshipDto }>>();
    const overflowRelationships: Array<{ category: string; relationships: FamilyRelationshipDto[] }> = [];

    // Root ni gen 0 ga qo'shish
    if (!generationMap.has(0)) generationMap.set(0, []);

    // Category bo'yicha tartiblash
    const mainCategories = ['grandparents', 'parents', 'siblings', 'spouse', 'children', 'grandchildren'];
    const overflowCategories = ['in-laws', 'extended', 'other'];

    for (const [cat, rels] of grouped) {
      if (overflowCategories.includes(cat)) {
        overflowRelationships.push({ category: cat, relationships: rels });
        continue;
      }

      const gen = getGeneration(cat);
      if (!generationMap.has(gen)) generationMap.set(gen, []);
      rels.forEach(rel => {
        generationMap.get(gen)!.push({ memberId: rel.toMemberId, rel });
      });
    }

    // Layout hisoblash
    const nodes: TreeNode[] = [];
    const edges: TreeEdge[] = [];

    // Gen 0 qatorini quramiz: [siblings...] [ROOT] [spouse]
    const gen0siblings = (grouped.get('siblings') || []);
    const gen0spouse = (grouped.get('spouse') || []);

    // Gen 0 qatoridagi barcha elementlar
    const gen0Items: Array<{ memberId: number; rel?: FamilyRelationshipDto; isRoot?: boolean }> = [];
    gen0siblings.forEach(rel => gen0Items.push({ memberId: rel.toMemberId, rel }));
    gen0Items.push({ memberId: rootMember.id, isRoot: true });
    gen0spouse.forEach(rel => gen0Items.push({ memberId: rel.toMemberId, rel }));

    // Har avlod uchun Y pozitsiya
    const generations = Array.from(new Set([
      ...mainCategories
        .filter(c => grouped.has(c))
        .map(c => getGeneration(c)),
      0 // root always gen 0
    ])).sort((a, b) => a - b);

    // Y pozitsiyalarni hisoblash
    const genYMap = new Map<number, number>();
    const minGen = Math.min(...generations);
    const maxGen = Math.max(...generations);

    let currentY = 0;
    for (let g = minGen; g <= maxGen; g++) {
      if (!generations.includes(g)) continue;
      genYMap.set(g, currentY);
      const { h } = getCardDimensions(g);
      currentY += h + V_GAP;
    }

    // ====== GEN 0 joylash (markaziy qator) ======
    const gen0Y = genYMap.get(0) ?? 0;
    const { w: rootW } = getCardDimensions(0);

    // Gen 0 ning umumiy kengligini hisoblash
    let gen0TotalWidth = 0;
    gen0Items.forEach((item, i) => {
      if (i > 0) {
        // Spouse uchun couple gap
        const prevItem = gen0Items[i - 1];
        const isCouple = (prevItem.isRoot && gen0spouse.some(r => r.toMemberId === item.memberId)) ||
                         (item.isRoot && gen0spouse.some(r => r.toMemberId === prevItem.memberId));
        gen0TotalWidth += isCouple ? COUPLE_GAP : H_GAP;
      }
      gen0TotalWidth += rootW;
    });

    // Gen 0 elementlarni joylash
    let gen0StartX = -gen0TotalWidth / 2;
    let rootNodeResult: TreeNode | null = null as TreeNode | null;

    gen0Items.forEach((item, i) => {
      if (i > 0) {
        const prevItem = gen0Items[i - 1];
        const isCouple = (prevItem.isRoot && gen0spouse.some(r => r.toMemberId === item.memberId)) ||
                         (item.isRoot && gen0spouse.some(r => r.toMemberId === prevItem.memberId));
        gen0StartX += isCouple ? COUPLE_GAP : H_GAP;
      }

      const member = membersMap.get(item.memberId);
      if (!member) return;

      const node: TreeNode = {
        memberId: item.memberId,
        member,
        relationship: item.rel,
        x: gen0StartX,
        y: gen0Y,
        generation: 0,
        isRoot: !!item.isRoot,
        size: 'normal',
      };

      // Spouse coupling
      if (item.isRoot && gen0spouse.length > 0) {
        node.coupleWith = gen0spouse[0].toMemberId;
      }
      if (!item.isRoot && gen0spouse.some(r => r.toMemberId === item.memberId)) {
        node.coupleWith = rootMember.id;
      }

      nodes.push(node);
      if (item.isRoot) rootNodeResult = node;

      gen0StartX += rootW;
    });

    // Root pozitsiyasini topish
    const rootX = rootNodeResult?.x ?? 0;
    const rootCenterX = rootX + rootW / 2;

    // Er-xotin juftlik markazini topish
    let coupleCenterX = rootCenterX;
    if (gen0spouse.length > 0) {
      const spouseNode = nodes.find(n => gen0spouse.some(r => r.toMemberId === n.memberId));
      if (spouseNode) {
        coupleCenterX = (rootX + rootW / 2 + spouseNode.x + rootW / 2) / 2;
      }
    }

    // ====== Boshqa avlodlarni joylash ======
    const placeGeneration = (gen: number, centerX: number) => {
      const cats = mainCategories.filter(c => getGeneration(c) === gen && grouped.has(c));
      if (cats.length === 0) return;

      const allRels: FamilyRelationshipDto[] = [];
      cats.forEach(c => allRels.push(...(grouped.get(c) || [])));

      const genY = genYMap.get(gen);
      if (genY === undefined) return;

      const { w } = getCardDimensions(gen);
      const isCompact = isCompactGeneration(gen);
      const totalWidth = allRels.length * w + (allRels.length - 1) * H_GAP;
      let startX = centerX - totalWidth / 2;

      allRels.forEach((rel) => {
        const member = membersMap.get(rel.toMemberId);
        if (!member) return;

        nodes.push({
          memberId: rel.toMemberId,
          member,
          relationship: rel,
          x: startX,
          y: genY,
          generation: gen,
          isRoot: false,
          size: isCompact ? 'compact' : 'normal',
        });

        startX += w + H_GAP;
      });
    };

    // Parents va grandparents — root ustida, rootCenterX ga nisbatan
    placeGeneration(-1, rootCenterX);
    placeGeneration(-2, rootCenterX);

    // Children va grandchildren — er-xotin juftligi ostida
    placeGeneration(1, coupleCenterX);
    placeGeneration(2, coupleCenterX);

    // ====== EDGES (connectorlar) ======

    // Spouse edges
    gen0spouse.forEach(rel => {
      edges.push({
        fromId: rootMember.id,
        toId: rel.toMemberId,
        type: 'spouse',
      });
    });

    // Sibling edges
    gen0siblings.forEach(rel => {
      edges.push({
        fromId: rootMember.id,
        toId: rel.toMemberId,
        type: 'sibling',
      });
    });

    // Parent-child edges
    const parentRels = grouped.get('parents') || [];
    parentRels.forEach(rel => {
      edges.push({
        fromId: rel.toMemberId,
        toId: rootMember.id,
        type: 'parent-child',
      });
    });

    // Grandparent-parent edges
    const gpRels = grouped.get('grandparents') || [];
    if (gpRels.length > 0 && parentRels.length > 0) {
      gpRels.forEach(gp => {
        // Har bir grandparent birinchi parent'ga ulangan
        edges.push({
          fromId: gp.toMemberId,
          toId: parentRels[0].toMemberId,
          type: 'parent-child',
        });
      });
    }

    // Children edges — root (yoki couple) dan
    const childRels = grouped.get('children') || [];
    childRels.forEach(rel => {
      edges.push({
        fromId: rootMember.id,
        toId: rel.toMemberId,
        type: 'parent-child',
      });
    });

    // Grandchildren edges
    const gcRels = grouped.get('grandchildren') || [];
    if (gcRels.length > 0 && childRels.length > 0) {
      gcRels.forEach(gc => {
        edges.push({
          fromId: childRels[0].toMemberId,
          toId: gc.toMemberId,
          type: 'parent-child',
        });
      });
    }

    // ====== Bounds hisoblash ======
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    nodes.forEach(node => {
      const { w, h } = getCardDimensions(node.generation);
      minX = Math.min(minX, node.x);
      maxX = Math.max(maxX, node.x + w);
      minY = Math.min(minY, node.y);
      maxY = Math.max(maxY, node.y + h);
    });

    // Padding qo'shish
    const PADDING = 60;
    const offsetX = -minX + PADDING;
    const offsetY = -minY + PADDING;

    // Barcha node'larni normallashtirish (0,0 dan boshlanishi uchun)
    nodes.forEach(node => {
      node.x += offsetX;
      node.y += offsetY;
    });

    const width = maxX - minX + PADDING * 2;
    const height = maxY - minY + PADDING * 2;

    // rootNode ni yangilash
    const finalRootNode = nodes.find(n => n.isRoot) ?? null;

    return { nodes, edges, width, height, rootNode: finalRootNode, overflowRelationships };
  }, [treeData]);
}

export { CARD_WIDTH, CARD_HEIGHT, CARD_WIDTH_COMPACT, CARD_HEIGHT_COMPACT };
