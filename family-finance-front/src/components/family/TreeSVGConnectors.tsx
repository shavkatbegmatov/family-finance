import type { TreeNode, TreeEdge } from '../../hooks/useTreeLayout';
import { CARD_WIDTH, CARD_HEIGHT, CARD_WIDTH_COMPACT, CARD_HEIGHT_COMPACT } from '../../hooks/useTreeLayout';

interface TreeSVGConnectorsProps {
  nodes: TreeNode[];
  edges: TreeEdge[];
  width: number;
  height: number;
}

function getNodeCenter(node: TreeNode): { cx: number; cy: number; w: number; h: number } {
  const w = node.size === 'compact' ? CARD_WIDTH_COMPACT : CARD_WIDTH;
  const h = node.size === 'compact' ? CARD_HEIGHT_COMPACT : CARD_HEIGHT;
  return {
    cx: node.x + w / 2,
    cy: node.y + h / 2,
    w,
    h,
  };
}

const STROKE_COLOR = 'hsl(var(--bc) / 0.15)';
const STROKE_WIDTH = 2;
const CORNER_RADIUS = 8;

export function TreeSVGConnectors({ nodes, edges, width, height }: TreeSVGConnectorsProps) {
  const nodeMap = new Map<number, TreeNode>();
  nodes.forEach(n => nodeMap.set(n.memberId, n));

  // Parent-child connectorlarni guruhlash: bitta parent'dan bir nechta child'ga
  const parentChildGroups = new Map<number, number[]>();
  edges.forEach(edge => {
    if (edge.type === 'parent-child') {
      const fromNode = nodeMap.get(edge.fromId);
      const toNode = nodeMap.get(edge.toId);
      if (fromNode && toNode && fromNode.generation < toNode.generation) {
        if (!parentChildGroups.has(edge.fromId)) parentChildGroups.set(edge.fromId, []);
        parentChildGroups.get(edge.fromId)!.push(edge.toId);
      }
    }
  });

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={width}
      height={height}
      style={{ overflow: 'visible' }}
    >
      <defs>
        <marker
          id="heart-marker"
          viewBox="0 0 20 20"
          refX="10"
          refY="10"
          markerWidth="16"
          markerHeight="16"
        >
          <text x="10" y="14" textAnchor="middle" fontSize="14">&#10084;</text>
        </marker>
      </defs>

      {edges.map((edge, i) => {
        const fromNode = nodeMap.get(edge.fromId);
        const toNode = nodeMap.get(edge.toId);
        if (!fromNode || !toNode) return null;

        const from = getNodeCenter(fromNode);
        const to = getNodeCenter(toNode);

        if (edge.type === 'spouse') {
          return (
            <g key={`edge-${i}`} className="animate-connector-draw">
              {/* Gorizontal chiziq */}
              <line
                x1={from.cx + from.w / 2}
                y1={from.cy}
                x2={to.cx - to.w / 2}
                y2={to.cy}
                stroke={STROKE_COLOR}
                strokeWidth={STROKE_WIDTH}
                strokeLinecap="round"
              />
              {/* Heart icon */}
              <foreignObject
                x={(from.cx + from.w / 2 + to.cx - to.w / 2) / 2 - 10}
                y={from.cy - 10}
                width="20"
                height="20"
                style={{ overflow: 'visible' }}
              >
                <div style={{
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  color: '#ef4444',
                }}>
                  &#10084;&#65039;
                </div>
              </foreignObject>
            </g>
          );
        }

        if (edge.type === 'sibling') {
          return (
            <g key={`edge-${i}`} className="animate-connector-draw">
              <line
                x1={from.cx + from.w / 2}
                y1={from.cy}
                x2={to.cx - to.w / 2}
                y2={to.cy}
                stroke={STROKE_COLOR}
                strokeWidth={STROKE_WIDTH}
                strokeLinecap="round"
                strokeDasharray="6 4"
              />
            </g>
          );
        }

        // Parent-child: faqat birinchi child'dan parent'gacha chizamiz, qolganlarini gruppada
        if (edge.type === 'parent-child') {
          // parent dan child ga (yuqoridan pastga)
          const isParentAbove = fromNode.generation < toNode.generation;
          if (!isParentAbove) return null; // teskari yo'nalishni skip

          // Bu parent uchun barcha children
          const childIds = parentChildGroups.get(edge.fromId);
          if (!childIds || childIds[0] !== edge.toId) return null; // faqat birinchi child'da chizamiz

          const parentBottom = from.cy + from.h / 2;
          const childrenNodes = childIds.map(id => nodeMap.get(id)).filter(Boolean) as TreeNode[];

          if (childrenNodes.length === 0) return null;

          // Crossbar Y — parent bilan children orasida
          const firstChildTop = childrenNodes[0].y;
          const midY = parentBottom + (firstChildTop - parentBottom) / 2;

          if (childrenNodes.length === 1) {
            // Bitta farzand — to'g'ri vertikal chiziq
            const childCenter = getNodeCenter(childrenNodes[0]);
            const r = CORNER_RADIUS;
            const childTop = childrenNodes[0].y;

            // Agar gorizontal farq bor bo'lsa, burchakli chiziq
            if (Math.abs(from.cx - childCenter.cx) > 2) {
              const path = `
                M ${from.cx} ${parentBottom}
                L ${from.cx} ${midY - r}
                Q ${from.cx} ${midY} ${from.cx + Math.sign(childCenter.cx - from.cx) * r} ${midY}
                L ${childCenter.cx - Math.sign(childCenter.cx - from.cx) * r} ${midY}
                Q ${childCenter.cx} ${midY} ${childCenter.cx} ${midY + r}
                L ${childCenter.cx} ${childTop}
              `;
              return (
                <path
                  key={`edge-${i}`}
                  d={path}
                  fill="none"
                  stroke={STROKE_COLOR}
                  strokeWidth={STROKE_WIDTH}
                  strokeLinecap="round"
                  className="animate-connector-draw"
                />
              );
            }

            return (
              <line
                key={`edge-${i}`}
                x1={from.cx}
                y1={parentBottom}
                x2={childCenter.cx}
                y2={childTop}
                stroke={STROKE_COLOR}
                strokeWidth={STROKE_WIDTH}
                strokeLinecap="round"
                className="animate-connector-draw"
              />
            );
          }

          // Ko'p farzand — crossbar
          const childCenters = childrenNodes.map(cn => getNodeCenter(cn));
          const leftX = Math.min(...childCenters.map(c => c.cx));
          const rightX = Math.max(...childCenters.map(c => c.cx));

          return (
            <g key={`edge-${i}`} className="animate-connector-draw">
              {/* Parent dan pastga */}
              <line
                x1={from.cx}
                y1={parentBottom}
                x2={from.cx}
                y2={midY}
                stroke={STROKE_COLOR}
                strokeWidth={STROKE_WIDTH}
                strokeLinecap="round"
              />
              {/* Gorizontal crossbar */}
              <line
                x1={leftX}
                y1={midY}
                x2={rightX}
                y2={midY}
                stroke={STROKE_COLOR}
                strokeWidth={STROKE_WIDTH}
                strokeLinecap="round"
              />
              {/* Har bir farzandga vertikal tarmoq */}
              {childrenNodes.map((cn, ci) => {
                const cc = getNodeCenter(cn);
                return (
                  <line
                    key={`branch-${ci}`}
                    x1={cc.cx}
                    y1={midY}
                    x2={cc.cx}
                    y2={cn.y}
                    stroke={STROKE_COLOR}
                    strokeWidth={STROKE_WIDTH}
                    strokeLinecap="round"
                  />
                );
              })}
            </g>
          );
        }

        return null;
      })}

      {/* Reverse parent-child edges: child dan parent ga (pastdan yuqoriga) */}
      {edges.filter(e => {
        if (e.type !== 'parent-child') return false;
        const fromN = nodeMap.get(e.fromId);
        const toN = nodeMap.get(e.toId);
        return fromN && toN && fromN.generation > toN.generation;
      }).map((edge, i) => {
        const childNode = nodeMap.get(edge.fromId)!;
        const parentNode = nodeMap.get(edge.toId)!;
        const child = getNodeCenter(childNode);
        const parent = getNodeCenter(parentNode);

        const parentBottom = parent.cy + parent.h / 2;
        const childTop = childNode.y;
        const midY = parentBottom + (childTop - parentBottom) / 2;

        if (Math.abs(parent.cx - child.cx) > 2) {
          const r = CORNER_RADIUS;
          const dir = Math.sign(child.cx - parent.cx);
          const path = `
            M ${parent.cx} ${parentBottom}
            L ${parent.cx} ${midY - r}
            Q ${parent.cx} ${midY} ${parent.cx + dir * r} ${midY}
            L ${child.cx - dir * r} ${midY}
            Q ${child.cx} ${midY} ${child.cx} ${midY + r}
            L ${child.cx} ${childTop}
          `;
          return (
            <path
              key={`rev-edge-${i}`}
              d={path}
              fill="none"
              stroke={STROKE_COLOR}
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
              className="animate-connector-draw"
            />
          );
        }

        return (
          <line
            key={`rev-edge-${i}`}
            x1={parent.cx}
            y1={parentBottom}
            x2={child.cx}
            y2={childTop}
            stroke={STROKE_COLOR}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            className="animate-connector-draw"
          />
        );
      })}
    </svg>
  );
}
