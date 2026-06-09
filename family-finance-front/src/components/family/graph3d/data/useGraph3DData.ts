import { useMemo } from 'react';
import type { HouseholdTreeResponse, TreeResponse } from '../../../../types';
import type { GraphData, GraphNode } from '../types';
import { mapPersonGraph } from './mapPersonGraph';
import { mapHouseholdGraph } from './mapHouseholdGraph';

interface Params {
  viewMode: 'person' | 'household';
  treeData?: TreeResponse | null;
  householdData?: HouseholdTreeResponse | null;
  showDeceased: boolean;
  genderFilter: 'ALL' | 'MALE' | 'FEMALE';
}

/**
 * Joriy `viewMode` ga mos mapper'ni tanlab {nodes, links} qaytaradi.
 * Person rejimida toolbar filtrlarini (vafot etganlar / jins) qo'llaydi va
 * endpointi olib tashlangan linklarni tashlaydi (force-graf dangling'da xato beradi).
 */
export function useGraph3DData({
  viewMode,
  treeData,
  householdData,
  showDeceased,
  genderFilter,
}: Params): GraphData {
  return useMemo(() => {
    if (viewMode === 'household') return mapHouseholdGraph(householdData);

    const full = mapPersonGraph(treeData);
    let nodes: GraphNode[] = full.nodes;
    if (!showDeceased) nodes = nodes.filter((n) => !n.deceased);
    if (genderFilter !== 'ALL') nodes = nodes.filter((n) => n.gender === genderFilter);

    if (nodes.length === full.nodes.length) return full;
    const keep = new Set(nodes.map((n) => n.id));
    const links = full.links.filter((l) => keep.has(l.source) && keep.has(l.target));
    return { nodes, links };
  }, [viewMode, treeData, householdData, showDeceased, genderFilter]);
}
