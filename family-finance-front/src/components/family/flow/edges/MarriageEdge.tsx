import { memo } from 'react';
import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react';
import type { MarriageEdgeData, EdgeRoutePoint } from '../../../../types';
import { buildPathWithBridges } from './pathUtils';

const KNOT_MASK_FILL = '#0a1734';

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
  const hoverActive = Boolean((edgeData as { hoverActive?: boolean }).hoverActive);
  const isHighlighted = Boolean((edgeData as { isHighlighted?: boolean }).isHighlighted);
  const isDimmed = Boolean((edgeData as { isDimmed?: boolean }).isDimmed);
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

  const edgeOpacity = hoverActive && isDimmed ? 0.2 : 1;
  const edgeFilter = isHighlighted ? `drop-shadow(0 0 7px ${strokeColor})` : undefined;
  const renderedStrokeWidth = isHighlighted ? strokeWidth + 0.9 : strokeWidth;

  return (
    <>
      <BaseEdge
        path={edgePath}
        style={{
          stroke: strokeColor,
          strokeWidth: renderedStrokeWidth,
          strokeDasharray,
          fill: 'none',
          strokeLinejoin: 'miter',
          strokeLinecap: 'square',
          opacity: edgeOpacity,
          filter: edgeFilter,
          transition: 'stroke-width 140ms ease, opacity 140ms ease, filter 140ms ease',
        }}
      />
      {junctionPoints.map((junction, index) => (
        <g key={`junction-${index}`} pointerEvents="none">
          <circle
            cx={junction.x}
            cy={junction.y}
            r={4.2}
            fill={KNOT_MASK_FILL}
            opacity={edgeOpacity}
            style={isHighlighted ? { filter: edgeFilter } : undefined}
          />
          <circle
            cx={junction.x}
            cy={junction.y}
            r={3.3}
            fill="#ffffff"
            stroke={strokeColor}
            strokeWidth={1.6}
            opacity={edgeOpacity}
            style={isHighlighted ? { filter: edgeFilter } : undefined}
          />
        </g>
      ))}
      {endpointPoints.map((point) => (
        <g key={point.key} pointerEvents="none">
          <circle
            cx={point.x}
            cy={point.y}
            r={4.4}
            fill={KNOT_MASK_FILL}
            opacity={edgeOpacity}
            style={isHighlighted ? { filter: edgeFilter } : undefined}
          />
          <circle
            cx={point.x}
            cy={point.y}
            r={3.6}
            fill={strokeColor}
            stroke="#ffffff"
            strokeWidth={1.2}
            opacity={edgeOpacity}
            style={isHighlighted ? { filter: edgeFilter } : undefined}
          />
        </g>
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
