import type { EdgeBridgePoint, EdgeRoutePoint } from '../../../../types';

const DEFAULT_BRIDGE_RADIUS = 6;

function n(value: number) {
  return Math.round(value * 100) / 100;
}

export function buildPathWithBridges(
  routePoints: EdgeRoutePoint[] | undefined,
  bridges: EdgeBridgePoint[] | undefined,
  bridgeRadius = DEFAULT_BRIDGE_RADIUS,
): string {
  if (!routePoints || routePoints.length < 2) return '';

  const bridgesBySegment = new Map<number, EdgeBridgePoint[]>();
  (bridges ?? []).forEach((bridge) => {
    const list = bridgesBySegment.get(bridge.segmentIndex) ?? [];
    list.push(bridge);
    bridgesBySegment.set(bridge.segmentIndex, list);
  });

  const start = routePoints[0];
  let path = `M ${n(start.x)} ${n(start.y)}`;

  for (let i = 0; i < routePoints.length - 1; i++) {
    const current = routePoints[i];
    const next = routePoints[i + 1];
    const segmentBridges = bridgesBySegment.get(i) ?? [];

    const isHorizontal = Math.abs(current.y - next.y) < 0.5;
    if (!isHorizontal || segmentBridges.length === 0) {
      path += ` L ${n(next.x)} ${n(next.y)}`;
      continue;
    }

    const sign = next.x >= current.x ? 1 : -1;
    const sortedBridges = segmentBridges
      .slice()
      .sort((a, b) => (sign > 0 ? a.x - b.x : b.x - a.x));

    let cursorX = current.x;
    const minX = Math.min(current.x, next.x);
    const maxX = Math.max(current.x, next.x);

    for (const bridge of sortedBridges) {
      const pre = bridge.x - sign * bridgeRadius;
      const post = bridge.x + sign * bridgeRadius;

      if (pre <= minX + 0.5 || post >= maxX - 0.5) {
        continue;
      }

      if ((sign > 0 && pre <= cursorX + 0.5) || (sign < 0 && pre >= cursorX - 0.5)) {
        continue;
      }

      path += ` L ${n(pre)} ${n(current.y)}`;
      path += ` Q ${n(bridge.x)} ${n(current.y - bridgeRadius)} ${n(post)} ${n(current.y)}`;
      cursorX = post;
    }

    path += ` L ${n(next.x)} ${n(next.y)}`;
  }

  return path;
}
