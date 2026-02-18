import { memo } from 'react';
import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react';
import type { MarriageEdgeData } from '../../../../types';
import { buildPathWithBridges } from './pathUtils';

function MarriageEdgeComponent(props: EdgeProps) {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data } = props;
  const edgeData = (data ?? {}) as MarriageEdgeData;
  const marriageType = edgeData.marriageType;
  const status = edgeData.status;

  const [fallbackPath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 0,
  });
  const edgePath = buildPathWithBridges(edgeData.routePoints, edgeData.bridges, 6) || fallbackPath;

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

export const MarriageEdge = memo(MarriageEdgeComponent);
