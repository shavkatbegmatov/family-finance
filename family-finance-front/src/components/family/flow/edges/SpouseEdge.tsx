import { type EdgeProps, getStraightPath, EdgeLabelRenderer } from '@xyflow/react';

export function SpouseEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  return (
    <>
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke="oklch(var(--er))"
        strokeWidth={2}
        style={style}
      />
      <EdgeLabelRenderer>
        <div
          className="pointer-events-none absolute text-base"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
          }}
        >
          ❤️
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
