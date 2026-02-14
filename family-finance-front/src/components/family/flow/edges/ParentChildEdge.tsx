import { type EdgeProps, getSmoothStepPath } from '@xyflow/react';

export function ParentChildEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
}: EdgeProps) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 8,
  });

  return (
    <path
      id={id}
      d={edgePath}
      fill="none"
      stroke="oklch(var(--bc) / 0.3)"
      strokeWidth={2}
      style={style}
    />
  );
}
