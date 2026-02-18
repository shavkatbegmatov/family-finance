import { memo } from 'react';
import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react';
import type { MarriageEdgeData, EdgeRoutePoint } from '../../../../types';
import { buildPathWithBridges } from './pathUtils';

function MarriageEdgeComponent(props: EdgeProps) {
  const {
    source,
    target,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
  } = props;
  const edgeData = (data ?? {}) as MarriageEdgeData;
  const marriageType = edgeData.marriageType;
  const status = edgeData.status;
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
  const edgePath = buildPathWithBridges(anchoredRoutePoints, edgeData.bridges, 6) || fallbackPath;
  const junctionPoints = edgeData.junctions ?? [];
  const endpointPoints = [
    { key: 'source', x: sourceX, y: sourceY, visible: isBusNode(source) },
    { key: 'target', x: targetX, y: targetY, visible: isBusNode(target) },
  ].filter((point) => point.visible);

  const isActive = status === 'ACTIVE';
  const isDivorced = marriageType === 'DIVORCED' || !isActive;
  const isPartnership = marriageType === 'PARTNERSHIP';

  let strokeDasharray: string | undefined;
  let strokeColor = '#6366f1'; // primary
  let strokeWidth = 2;

  if (isDivorced) {
    strokeDasharray = '8 4';
    strokeColor = '#f59e0b'; // warning
    strokeWidth = 1.5;
  } else if (isPartnership) {
    strokeDasharray = '4 4';
    strokeColor = '#8b5cf6'; // purple
    strokeWidth = 1.5;
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
      {junctionPoints.map((junction, index) => (
        <circle
          key={`junction-${index}`}
          cx={junction.x}
          cy={junction.y}
          r={3.3}
          fill="#ffffff"
          stroke={strokeColor}
          strokeWidth={1.6}
          pointerEvents="none"
        />
      ))}
      {endpointPoints.map((point) => (
        <circle
          key={point.key}
          cx={point.x}
          cy={point.y}
          r={3.6}
          fill={strokeColor}
          stroke="#ffffff"
          strokeWidth={1.2}
          pointerEvents="none"
        />
      ))}
    </>
  );
}

export const MarriageEdge = memo(MarriageEdgeComponent);

function isBusNode(nodeId: string) {
  return nodeId.startsWith('fu_bus_');
}

function getAnchoredRoutePoints(
  routePoints: EdgeRoutePoint[] | undefined,
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
) {
  if (!routePoints || routePoints.length < 2) return routePoints;

  const anchored = routePoints.slice();
  const first = anchored[0];
  const last = anchored[anchored.length - 1];

  if (isReasonableAnchor(first, sourceX, sourceY)) {
    anchored[0] = { x: sourceX, y: sourceY };
  }
  if (isReasonableAnchor(last, targetX, targetY)) {
    anchored[anchored.length - 1] = { x: targetX, y: targetY };
  }

  return anchored;
}

function isReasonableAnchor(point: EdgeRoutePoint, x: number, y: number) {
  const dx = point.x - x;
  const dy = point.y - y;
  return Math.hypot(dx, dy) <= 80;
}
