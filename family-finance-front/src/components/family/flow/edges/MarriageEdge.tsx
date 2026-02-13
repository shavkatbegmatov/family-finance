import { memo } from 'react';
import { BaseEdge, getStraightPath, type EdgeProps } from '@xyflow/react';

function MarriageEdgeComponent(props: EdgeProps) {
  const { sourceX, sourceY, targetX, targetY, data } = props;
  const marriageType = (data as { marriageType?: string })?.marriageType;
  const status = (data as { status?: string })?.status;

  const [edgePath] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

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
      }}
    />
  );
}

export const MarriageEdge = memo(MarriageEdgeComponent);
