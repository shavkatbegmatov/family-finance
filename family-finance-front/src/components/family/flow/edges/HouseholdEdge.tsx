import { memo } from 'react';
import { BaseEdge, type EdgeProps } from '@xyflow/react';

/** Kesishish ko'prikchasi radiusi (gorizontal chiziq vertikal ustidan sakraydi). */
const HOP_R = 7;
/** Burilish radiusi. */
const BEND_R = 12;

/**
 * Orthogonal xonadon-edge: source (farzand avatari tagi) → yo'lak (routingY)
 * → target (yangi xonadon tepasi). Layout bergan qo'shimchalar:
 * `hops` — boshqa chiziqlar vertikallari bilan kesishish X'lari (ko'prikcha),
 * `junction` — bir nuqtadan bir nechta chiziq ayrilsa tugun-doira,
 * `color` — xonadon-bazali chiziq rangi.
 */
function HouseholdEdgeComponent(props: EdgeProps) {
  const { id, sourceX, sourceY, targetX, targetY, style, markerEnd, data } = props;

  // Layout taxminiy balandlik bilan routingY beradi — haqiqiy handle
  // koordinatalari bilan clamp (chiziq karta ichiga kirmasin).
  const rawRoutingY = (data?.routingY as number) ?? (sourceY + targetY) / 2;
  const routingY =
    sourceY + 16 < targetY - 24
      ? Math.min(Math.max(rawRoutingY, sourceY + 16), targetY - 24)
      : (sourceY + targetY) / 2;

  const hops = ((data?.hops as number[]) ?? []).filter(
    (hx) =>
      hx > Math.min(sourceX, targetX) + BEND_R + HOP_R &&
      hx < Math.max(sourceX, targetX) - BEND_R - HOP_R,
  );
  const color = (data?.color as string) ?? 'oklch(var(--bc) / 0.35)';
  const junction = Boolean(data?.junction);

  const hDist = Math.abs(targetX - sourceX);
  const vDist1 = Math.abs(routingY - sourceY);
  const vDist2 = Math.abs(targetY - routingY);
  const r = Math.min(BEND_R, vDist1, vDist2, hDist / 2);

  let path = '';
  if (r <= 0 || hDist < 1) {
    // To'g'ri vertikal tushish (source va target bir ustunda)
    path = `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
  } else {
    const dx = targetX > sourceX ? 1 : -1;
    const dy1 = routingY > sourceY ? 1 : -1;
    const dy2 = targetY > routingY ? 1 : -1;
    // Ko'prikchalar chizish yo'nalishida tartiblanadi
    const orderedHops = [...hops].sort((a, b) => (dx > 0 ? a - b : b - a));
    // Yuqoridan aylanish: chapdan-o'ngga sweep=1, o'ngdan-chapga sweep=0
    const sweep = dx > 0 ? 1 : 0;

    let d =
      `M ${sourceX} ${sourceY} ` +
      `L ${sourceX} ${routingY - dy1 * r} ` +
      `Q ${sourceX} ${routingY} ${sourceX + dx * r} ${routingY} `;
    for (const hx of orderedHops) {
      d +=
        `L ${hx - dx * HOP_R} ${routingY} ` +
        `A ${HOP_R} ${HOP_R} 0 0 ${sweep} ${hx + dx * HOP_R} ${routingY} `;
    }
    d +=
      `L ${targetX - dx * r} ${routingY} ` +
      `Q ${targetX} ${routingY} ${targetX} ${routingY + dy2 * r} ` +
      `L ${targetX} ${targetY}`;
    path = d;
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
          cy={sourceY + Math.min(10, Math.max(2, (routingY - sourceY) / 2))}
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
