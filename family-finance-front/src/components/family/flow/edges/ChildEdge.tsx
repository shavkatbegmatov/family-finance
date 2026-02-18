import { memo } from 'react';
import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react';
import type { ChildEdgeData } from '../../../../types';
import { buildPathWithBridges } from './pathUtils';

function ChildEdgeComponent(props: EdgeProps) {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data } = props;
  const edgeData = (data ?? {}) as ChildEdgeData;
  const lineageType = edgeData.lineageType || 'BIOLOGICAL';
  const edgeKind = edgeData.edgeKind || 'child';

  const [fallbackPath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 0,
  });
  const edgePath = buildPathWithBridges(edgeData.routePoints, edgeData.bridges, 5) || fallbackPath;

  let strokeDasharray: string | undefined;
  let strokeColor = '#64748b'; // slate
  const strokeWidth = 1.5;

  if (edgeKind === 'trunk') {
    strokeColor = '#475569';
  } else {
    switch (lineageType) {
      case 'BIOLOGICAL':
        // Solid line
        break;
      case 'ADOPTED':
        strokeDasharray = '6 4';
        strokeColor = '#22c55e'; // green
        break;
      case 'STEP':
        strokeDasharray = '8 3 2 3';
        strokeColor = '#f59e0b'; // amber
        break;
      case 'FOSTER':
        strokeDasharray = '4 4';
        strokeColor = '#06b6d4'; // cyan
        break;
      case 'GUARDIAN':
        strokeDasharray = '2 4';
        strokeColor = '#8b5cf6'; // purple
        break;
    }
  }

  return (
    <BaseEdge
      path={edgePath}
      style={{
        stroke: strokeColor,
        strokeWidth,
        strokeDasharray,
        fill: 'none',
        strokeLinejoin: 'miter',
        strokeLinecap: 'square',
      }}
    />
  );
}

export const ChildEdge = memo(ChildEdgeComponent);
