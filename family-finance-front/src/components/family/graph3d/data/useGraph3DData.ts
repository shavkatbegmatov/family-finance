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
    let result: GraphData;
    if (viewMode === 'household') {
      result = mapHouseholdGraph(householdData);
    } else {
      const full = mapPersonGraph(treeData);
      let nodes: GraphNode[] = full.nodes;
      if (!showDeceased) nodes = nodes.filter((n) => !n.deceased);
      if (genderFilter !== 'ALL') nodes = nodes.filter((n) => n.gender === genderFilter);

      if (nodes.length === full.nodes.length) {
        result = full;
      } else {
        const keep = new Set(nodes.map((n) => n.id));
        const links = full.links.filter((l) => keep.has(l.source) && keep.has(l.target));
        result = { nodes, links };
      }
    }

    // Har tugunning bog'lanishlar sonini (degree) hisoblaymiz — node o'lchami
    // va label LOD shu asosida belgilanadi.
    const degree = new Map<string, number>();
    result.links.forEach((l) => {
      degree.set(l.source, (degree.get(l.source) ?? 0) + 1);
      degree.set(l.target, (degree.get(l.target) ?? 0) + 1);
    });
    result.nodes.forEach((n) => {
      n.degree = degree.get(n.id) ?? 0;
    });
    return result;
  }, [viewMode, treeData, householdData, showDeceased, genderFilter]);
}
