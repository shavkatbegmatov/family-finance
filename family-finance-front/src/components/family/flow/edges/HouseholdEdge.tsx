import { memo } from 'react';
import { BaseEdge, type EdgeProps } from '@xyflow/react';

/** Kesishish ko'prikchasi radiusi (gorizontal chiziq vertikal ustidan sakraydi). */
const HOP_R = 7;
/** Burilish radiusi. */
const BEND_R = 12;

type Pt = [number, number];

/**
 * Orthogonal xonadon-edge — layout bergan waypoint'lar (points) bo'ylab
 * burchak radiusli yo'l quradi. Ko'p qatorni kesib o'tuvchi chiziqlar
 * kartalar orasidagi kanallardan yuradi (points shuni aks ettiradi).
 * `hops` — kesishish nuqtalari [x,y]: tegishli gorizontal segmentda
 * ko'prikcha-arc chiziladi. `junction` — ayrilish tuguni.
 */
function HouseholdEdgeComponent(props: EdgeProps) {
  const { id, sourceX, sourceY, targetX, targetY, style, markerEnd, data } = props;

  const rawPoints = (data?.points as Pt[] | undefined) ?? [];
  const hops = (data?.hops as Pt[] | undefined) ?? [];
  const color = (data?.color as string) ?? 'oklch(var(--bc) / 0.35)';
  const junction = Boolean(data?.junction);

  // Waypoint'larning chetlarini HAQIQIY handle koordinatalariga bog'lash
  // (layout taxminiy karta balandligi bilan ishlagan): birinchi vertikal
  // sourceX'da, oxirgisi targetX'da qoladi.
  const pts: Pt[] = rawPoints.length >= 2 ? [...rawPoints] : [
    [sourceX, sourceY],
    [sourceX, (sourceY + targetY) / 2],
    [targetX, (sourceY + targetY) / 2],
    [targetX, targetY],
  ];
  pts[0] = [sourceX, sourceY];
  if (pts.length >= 2) pts[1] = [sourceX, Math.max(pts[1][1], sourceY + 12)];
  pts[pts.length - 1] = [targetX, targetY];
  if (pts.length >= 2) {
    const beforeLast = pts[pts.length - 2];
    pts[pts.length - 2] = [targetX, Math.min(beforeLast[1], targetY - 12)];
  }

  // Ketma-ket dublikat nuqtalarni tashlash (nol segmentlar)
  const clean: Pt[] = [];
  pts.forEach((p) => {
    const prev = clean[clean.length - 1];
    if (!prev || Math.abs(prev[0] - p[0]) > 0.5 || Math.abs(prev[1] - p[1]) > 0.5) {
      clean.push(p);
    }
  });

  let path = `M ${clean[0][0]} ${clean[0][1]} `;
  for (let i = 1; i < clean.length; i++) {
    const [px, py] = clean[i - 1];
    const [cx, cy] = clean[i];
    const isH = Math.abs(py - cy) < 0.5;
    const next = clean[i + 1];

    // Gorizontal segmentda shu segmentga tegishli ko'prikchalar
    if (isH) {
      const dx = cx > px ? 1 : -1;
      const sweep = dx > 0 ? 1 : 0;
      const segHops = hops
        .filter(
          ([hx, hy]) =>
            Math.abs(hy - py) < 1.5 &&
            hx > Math.min(px, cx) + BEND_R + HOP_R &&
            hx < Math.max(px, cx) - BEND_R - HOP_R,
        )
        .sort((a, b) => (dx > 0 ? a[0] - b[0] : b[0] - a[0]));
      for (const [hx] of segHops) {
        path += `L ${hx - dx * HOP_R} ${py} A ${HOP_R} ${HOP_R} 0 0 ${sweep} ${hx + dx * HOP_R} ${py} `;
      }
    }

    if (!next) {
      path += `L ${cx} ${cy} `;
      break;
    }

    // Burilish radiusi: joriy nuqtaga to'liq bormasdan, radius bilan burilamiz
    const [nx, ny] = next;
    const inLen = Math.abs(cx - px) + Math.abs(cy - py);
    const outLen = Math.abs(nx - cx) + Math.abs(ny - cy);
    const r = Math.min(BEND_R, inLen / 2, outLen / 2);
    if (r < 1) {
      path += `L ${cx} ${cy} `;
      continue;
    }
    const inDx = Math.sign(cx - px);
    const inDy = Math.sign(cy - py);
    const outDx = Math.sign(nx - cx);
    const outDy = Math.sign(ny - cy);
    path +=
      `L ${cx - inDx * r} ${cy - inDy * r} ` +
      `Q ${cx} ${cy} ${cx + outDx * r} ${cy + outDy * r} `;
  }

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={{ ...style, fill: 'none' }}
      />
      {/* Tutashish tuguni — bir nuqtadan bir nechta chiziq ayrilganda */}
      {junction && (
        <circle
          cx={sourceX}
          cy={sourceY + 8}
          r={3.5}
          fill={color}
          stroke="oklch(var(--b1))"
          strokeWidth={1}
        />
      )}
    </>
  );
}

export const HouseholdEdge = memo(HouseholdEdgeComponent);
