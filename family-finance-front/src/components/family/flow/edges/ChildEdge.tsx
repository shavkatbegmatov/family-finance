import { memo } from 'react';
import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react';

function ChildEdgeComponent(props: EdgeProps) {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data } = props;
  const lineageType = (data as { lineageType?: string })?.lineageType || 'BIOLOGICAL';

  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 8,
  });

  let strokeDasharray: string | undefined;
  let strokeColor = '#64748b'; // slate
  const strokeWidth = 1.5;

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

  return (
    <BaseEdge
      path={edgePath}
      style={{
        stroke: strokeColor,
        strokeWidth,
        strokeDasharray,
      }}
    />
  );
}

export const ChildEdge = memo(ChildEdgeComponent);
