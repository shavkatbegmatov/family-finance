import { memo } from 'react';
import { BaseEdge, type EdgeProps } from '@xyflow/react';

function HouseholdEdgeComponent(props: EdgeProps) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    style,
    markerEnd,
    data,
  } = props;

  const routingY = (data?.routingY as number) ?? (sourceY + targetY) / 2;
  const borderRadius = 12;

  const startX = sourceX;
  const startY = sourceY;
  const endX = targetX;
  const endY = targetY;

  const hDist = Math.abs(endX - startX);
  const vDist1 = Math.abs(routingY - startY);
  const vDist2 = Math.abs(endY - routingY);

  const r = Math.min(borderRadius, vDist1, vDist2, hDist / 2);

  let path = '';
  if (r <= 0 || hDist < 1) {
    // Linear orthogonal fallback if too close or aligned
    path = `M ${startX} ${startY} L ${endX} ${endY}`;
  } else {
    const dx = endX > startX ? 1 : -1;
    const dy1 = routingY > startY ? 1 : -1;
    const dy2 = endY > routingY ? 1 : -1;

    path =
      `M ${startX} ${startY} ` +
      `L ${startX} ${routingY - dy1 * r} ` +
      `Q ${startX} ${routingY} ${startX + dx * r} ${routingY} ` +
      `L ${endX - dx * r} ${routingY} ` +
      `Q ${endX} ${routingY} ${endX} ${routingY + dy2 * r} ` +
      `L ${endX} ${endY}`;
  }

  return (
    <BaseEdge
      id={id}
      path={path}
      markerEnd={markerEnd}
      style={{
        ...style,
        fill: 'none',
      }}
    />
  );
}

export const HouseholdEdge = memo(HouseholdEdgeComponent);
