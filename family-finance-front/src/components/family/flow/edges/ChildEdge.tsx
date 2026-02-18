import { memo } from 'react';
import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react';
import type { ChildEdgeData, EdgeRoutePoint } from '../../../../types';
import { buildPathWithBridges } from './pathUtils';

function ChildEdgeComponent(props: EdgeProps) {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data } = props;
  const edgeData = (data ?? {}) as ChildEdgeData;
  const lineageType = edgeData.lineageType || 'BIOLOGICAL';
  const edgeKind = edgeData.edgeKind || 'child';
  const anchoredRoutePoints = getAnchoredRoutePoints(edgeData.routePoints, sourceX, sourceY, targetX, targetY);

  const [fallbackPath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 0,
  });
  const edgePath = buildPathWithBridges(anchoredRoutePoints, edgeData.bridges, 5) || fallbackPath;
  const connectionPoints = [
    { x: sourceX, y: sourceY },
    { x: targetX, y: targetY },
  ];
  const junctionPoints = edgeData.junctions ?? [];

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
    <>
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
      {connectionPoints.map((point, index) => (
        <circle
          key={`conn-${index}`}
          cx={point.x}
          cy={point.y}
          r={2.4}
          fill={strokeColor}
          stroke="#ffffff"
          strokeWidth={1}
          pointerEvents="none"
        />
      ))}
      {junctionPoints.map((junction, index) => (
        <circle
          key={`junction-${index}`}
          cx={junction.x}
          cy={junction.y}
          r={3.2}
          fill="#ffffff"
          stroke={strokeColor}
          strokeWidth={1.6}
          pointerEvents="none"
        />
      ))}
    </>
  );
}

export const ChildEdge = memo(ChildEdgeComponent);

function getAnchoredRoutePoints(
  routePoints: EdgeRoutePoint[] | undefined,
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
) {
  if (!routePoints || routePoints.length < 2) return routePoints;

  const anchored = routePoints.slice();
  anchored[0] = { x: sourceX, y: sourceY };
  anchored[anchored.length - 1] = { x: targetX, y: targetY };
  return anchored;
}
