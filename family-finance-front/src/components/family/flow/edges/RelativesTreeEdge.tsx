import { type EdgeProps } from '@xyflow/react';

export function RelativesTreeEdge({
    id,
    data,
}: EdgeProps) {
    if (!data) return null;

    const { startX, startY, endX, endY } = data as { startX: number, startY: number, endX: number, endY: number };

    const strokeWidth = 2;
    const strokeColor = '#94a3b8'; // tailwind slate-400 equivalent for generic lines

    let path = '';

    // Draw orthogonal lines
    if (startX === endX || startY === endY) {
        // Straight line
        path = `M ${startX} ${startY} L ${endX} ${endY}`;
    } else {
        // L-shape with rounded corner
        // Assuming standard top-down or bottom-up reading
        // Usually relatives-tree connectors are horizontal then vertical or vice versa.
        // For simplicity, we just do a centered elbow or a single elbow.
        // Relatives tree connectors are exact segments. If startX != endX AND startY != endY it shouldn't happen
        // because relatives-tree returns orthogonal segments [x1, y1, x2, y1] or [x1, y1, x1, y2].
        // But just in case, we do a basic elbow here:

        // We expect orthogonal segments. So startX should equal endX OR startY should equal endY.
        // If we reach here, it's a diagonal edge, which shouldn't happen with standard relatives-tree connectors.
        // We'll just draw a straight line.
        path = `M ${startX} ${startY} L ${endX} ${endY}`;
    }

    // To draw absolute SVG paths in ReactFlow without relying on the built-in source/target handles,
    // we must return a <path /> inside a <svg> or just use the <path> if it's placed in the svg container.
    // ReactFlow automatically wraps Edge components in an SVG group (<g>).
    // The path coordinates must be absolute. ReactFlow expects absolute coordinates if we ignore sourceX/sourceY.

    return (
        <>
            <path
                id={id}
                d={path}
                fill="none"
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                className="react-flow__edge-path"
            />
        </>
    );
}
