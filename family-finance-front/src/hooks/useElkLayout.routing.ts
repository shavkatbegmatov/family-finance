/**
 * Obstacle-aware orthogonal edge routing for family tree visualization.
 *
 * Post-layout routing: ELK layout + partner/child adjustments tugagandan keyin,
 * barcha node'lar final pozitsiyada bo'lgach, chiziqlarni node'lar atrofidan o'tkazadi.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ObstacleRect {
  nodeId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HorizontalChannel {
  y: number;
  minX: number;
  maxX: number;
}

export interface VerticalChannel {
  x: number;
  minY: number;
  maxY: number;
}

export interface RoutingContext {
  obstacles: ObstacleRect[];
  horizontalChannels: HorizontalChannel[];
  verticalChannels: VerticalChannel[];
}

export interface EdgeRoutePoint {
  x: number;
  y: number;
}

interface NodeBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PERSON_MARGIN = 8;
const PAIR_BUS_MARGIN = 4;
const CHANNEL_GAP = 20;
const EPSILON = 0.5;

// ─── Build Routing Context ───────────────────────────────────────────────────

export function buildRoutingContext(
  nodeBounds: Map<string, NodeBounds>,
  _defaultMargin: number,
): RoutingContext {
  const obstacles: ObstacleRect[] = [];

  for (const [nodeId, bounds] of nodeBounds) {
    const margin = nodeId.startsWith('person_') ? PERSON_MARGIN : PAIR_BUS_MARGIN;
    obstacles.push({
      nodeId,
      x: bounds.x - margin,
      y: bounds.y - margin,
      width: bounds.width + margin * 2,
      height: bounds.height + margin * 2,
    });
  }

  const horizontalChannels = computeHorizontalChannels(obstacles);
  const verticalChannels = computeVerticalChannels(obstacles);

  return { obstacles, horizontalChannels, verticalChannels };
}

function computeHorizontalChannels(obstacles: ObstacleRect[]): HorizontalChannel[] {
  if (obstacles.length === 0) return [];

  const sorted = obstacles.slice().sort((a, b) => a.y - b.y);
  const channels: HorizontalChannel[] = [];

  const globalMinX = Math.min(...obstacles.map((o) => o.x)) - 50;
  const globalMaxX = Math.max(...obstacles.map((o) => o.x + o.width)) + 50;

  for (let i = 0; i < sorted.length - 1; i++) {
    const bottomOfUpper = sorted[i].y + sorted[i].height;
    const topOfLower = sorted[i + 1].y;

    if (topOfLower - bottomOfUpper > CHANNEL_GAP) {
      channels.push({
        y: (bottomOfUpper + topOfLower) / 2,
        minX: globalMinX,
        maxX: globalMaxX,
      });
    }
  }

  // Eng yuqori va eng pastda ham channel qo'shish
  const topY = sorted[0].y;
  channels.push({ y: topY - 40, minX: globalMinX, maxX: globalMaxX });

  const bottomY = sorted[sorted.length - 1].y + sorted[sorted.length - 1].height;
  channels.push({ y: bottomY + 40, minX: globalMinX, maxX: globalMaxX });

  return channels;
}

function computeVerticalChannels(obstacles: ObstacleRect[]): VerticalChannel[] {
  if (obstacles.length === 0) return [];

  const sorted = obstacles.slice().sort((a, b) => a.x - b.x);
  const channels: VerticalChannel[] = [];

  const globalMinY = Math.min(...obstacles.map((o) => o.y)) - 50;
  const globalMaxY = Math.max(...obstacles.map((o) => o.y + o.height)) + 50;

  for (let i = 0; i < sorted.length - 1; i++) {
    const rightOfLeft = sorted[i].x + sorted[i].width;
    const leftOfRight = sorted[i + 1].x;

    if (leftOfRight - rightOfLeft > CHANNEL_GAP) {
      channels.push({
        x: (rightOfLeft + leftOfRight) / 2,
        minY: globalMinY,
        maxY: globalMaxY,
      });
    }
  }

  // Eng chap va eng o'ngda channel
  const leftX = sorted[0].x;
  channels.push({ x: leftX - 40, minY: globalMinY, maxY: globalMaxY });

  const rightX = sorted[sorted.length - 1].x + sorted[sorted.length - 1].width;
  channels.push({ x: rightX + 40, minY: globalMinY, maxY: globalMaxY });

  return channels;
}

// ─── Segment-Obstacle Intersection ───────────────────────────────────────────

export function segmentIntersectsObstacle(
  ax: number, ay: number,
  bx: number, by: number,
  obstacles: ObstacleRect[],
  excludeNodeIds: Set<string>,
): ObstacleRect | null {
  const segMinX = Math.min(ax, bx);
  const segMaxX = Math.max(ax, bx);
  const segMinY = Math.min(ay, by);
  const segMaxY = Math.max(ay, by);

  for (const o of obstacles) {
    if (excludeNodeIds.has(o.nodeId)) continue;

    const oRight = o.x + o.width;
    const oBottom = o.y + o.height;

    if (Math.abs(ay - by) < EPSILON) {
      // Gorizontal segment: Y bir xil
      const yInside = ay > o.y - EPSILON && ay < oBottom + EPSILON;
      const xOverlap = segMaxX > o.x + EPSILON && segMinX < oRight - EPSILON;
      if (yInside && xOverlap) return o;
    } else if (Math.abs(ax - bx) < EPSILON) {
      // Vertikal segment: X bir xil
      const xInside = ax > o.x - EPSILON && ax < oRight + EPSILON;
      const yOverlap = segMaxY > o.y + EPSILON && segMinY < oBottom - EPSILON;
      if (xInside && yOverlap) return o;
    }
  }

  return null;
}

// ─── Channel Finders ─────────────────────────────────────────────────────────

export function findFreeHorizontalChannel(
  ctx: RoutingContext,
  xStart: number,
  xEnd: number,
  preferY: number,
  excludeNodeIds: Set<string>,
): number | null {
  const minX = Math.min(xStart, xEnd);
  const maxX = Math.max(xStart, xEnd);

  const candidates = ctx.horizontalChannels
    .filter((ch) => ch.minX <= minX && ch.maxX >= maxX)
    .filter((ch) => {
      return !segmentIntersectsObstacle(minX, ch.y, maxX, ch.y, ctx.obstacles, excludeNodeIds);
    })
    .sort((a, b) => Math.abs(a.y - preferY) - Math.abs(b.y - preferY));

  return candidates.length > 0 ? candidates[0].y : null;
}

export function findFreeVerticalChannel(
  ctx: RoutingContext,
  yStart: number,
  yEnd: number,
  preferX: number,
  excludeNodeIds: Set<string>,
): number | null {
  const minY = Math.min(yStart, yEnd);
  const maxY = Math.max(yStart, yEnd);

  const candidates = ctx.verticalChannels
    .filter((ch) => ch.minY <= minY && ch.maxY >= maxY)
    .filter((ch) => {
      return !segmentIntersectsObstacle(ch.x, minY, ch.x, maxY, ctx.obstacles, excludeNodeIds);
    })
    .sort((a, b) => Math.abs(a.x - preferX) - Math.abs(b.x - preferX));

  return candidates.length > 0 ? candidates[0].x : null;
}

// ─── Edge Routing Dispatcher ─────────────────────────────────────────────────

export function routeEdgeWithObstacleAvoidance(
  source: EdgeRoutePoint,
  target: EdgeRoutePoint,
  edgeKind: string,
  sourceNodeId: string,
  targetNodeId: string,
  ctx: RoutingContext,
): EdgeRoutePoint[] {
  const excludeNodeIds = new Set<string>();
  excludeNodeIds.add(sourceNodeId);
  excludeNodeIds.add(targetNodeId);

  switch (edgeKind) {
    case 'marriage':
      return routeMarriageEdge(source, target, ctx, excludeNodeIds);
    case 'trunk':
      return routeTrunkEdge(source, target, ctx, excludeNodeIds);
    case 'child':
      return routeChildEdge(source, target, ctx, excludeNodeIds);
    default:
      return [source, target];
  }
}

// ─── Marriage Edge Routing ───────────────────────────────────────────────────

function routeMarriageEdge(
  source: EdgeRoutePoint,
  target: EdgeRoutePoint,
  ctx: RoutingContext,
  excludeNodeIds: Set<string>,
): EdgeRoutePoint[] {
  // Standart L-shakl: pastga (source.x), keyin gorizontal (target.y ga)
  const corner = { x: source.x, y: target.y };

  // Vertikal segment tekshiruvi: source → corner
  const vObstacle = segmentIntersectsObstacle(
    source.x, source.y, corner.x, corner.y, ctx.obstacles, excludeNodeIds,
  );

  // Gorizontal segment tekshiruvi: corner → target
  const hObstacle = segmentIntersectsObstacle(
    corner.x, corner.y, target.x, target.y, ctx.obstacles, excludeNodeIds,
  );

  if (!vObstacle && !hObstacle) {
    return [source, corner, target];
  }

  // Obstacle bor — channel orqali aylanib o'tish
  const midY = (source.y + target.y) / 2;
  const channelY = findFreeHorizontalChannel(
    ctx, source.x, target.x, midY, excludeNodeIds,
  );

  if (channelY !== null) {
    // Vertikal detour uchun channel topish
    const detourX = target.x > source.x
      ? findFreeVerticalChannel(ctx, source.y, target.y, (source.x + target.x) / 2, excludeNodeIds)
      : findFreeVerticalChannel(ctx, source.y, target.y, (source.x + target.x) / 2, excludeNodeIds);

    if (detourX !== null) {
      return [
        source,
        { x: source.x, y: channelY },
        { x: detourX, y: channelY },
        { x: detourX, y: target.y },
        target,
      ];
    }

    // Faqat gorizontal channel bilan
    return [
      source,
      { x: source.x, y: channelY },
      { x: target.x, y: channelY },
      target,
    ];
  }

  // Fallback: oddiy L
  return [source, corner, target];
}

// ─── Trunk Edge Routing ──────────────────────────────────────────────────────

function routeTrunkEdge(
  source: EdgeRoutePoint,
  target: EdgeRoutePoint,
  ctx: RoutingContext,
  excludeNodeIds: Set<string>,
): EdgeRoutePoint[] {
  // To'g'ri vertikal
  if (Math.abs(source.x - target.x) < EPSILON) {
    const obstacle = segmentIntersectsObstacle(
      source.x, source.y, target.x, target.y, ctx.obstacles, excludeNodeIds,
    );

    if (!obstacle) {
      return [source, target];
    }

    // Obstacle bo'lsa — Z-shakl
    const detourX = findFreeVerticalChannel(
      ctx, source.y, target.y, source.x, excludeNodeIds,
    );

    if (detourX !== null) {
      const midY = (source.y + target.y) / 2;
      return [
        source,
        { x: source.x, y: midY },
        { x: detourX, y: midY },
        { x: detourX, y: target.y },
        target,
      ];
    }

    return [source, target];
  }

  // Z-shakl trunk
  const midY = (source.y + target.y) / 2;
  const obstacle = segmentIntersectsObstacle(
    source.x, midY, target.x, midY, ctx.obstacles, excludeNodeIds,
  );

  if (!obstacle) {
    return [
      source,
      { x: source.x, y: midY },
      { x: target.x, y: midY },
      target,
    ];
  }

  // Gorizontal qismda obstacle bor — boshqa Y channel izlash
  const channelY = findFreeHorizontalChannel(
    ctx, source.x, target.x, midY, excludeNodeIds,
  );

  if (channelY !== null) {
    return [
      source,
      { x: source.x, y: channelY },
      { x: target.x, y: channelY },
      target,
    ];
  }

  return [
    source,
    { x: source.x, y: midY },
    { x: target.x, y: midY },
    target,
  ];
}

// ─── Child Edge Routing ──────────────────────────────────────────────────────

function routeChildEdge(
  source: EdgeRoutePoint,
  target: EdgeRoutePoint,
  ctx: RoutingContext,
  excludeNodeIds: Set<string>,
): EdgeRoutePoint[] {
  // Standart: gorizontal (bus-line), keyin vertikal tushish
  // Agar source va target bir X da bo'lsa — to'g'ri vertikal
  if (Math.abs(source.x - target.x) < EPSILON) {
    const obstacle = segmentIntersectsObstacle(
      source.x, source.y, target.x, target.y, ctx.obstacles, excludeNodeIds,
    );

    if (!obstacle) {
      return [source, target];
    }
  }

  // L-shakl: gorizontal keyin vertikal
  const bendPoint = { x: target.x, y: source.y };

  const hObstacle = segmentIntersectsObstacle(
    source.x, source.y, bendPoint.x, bendPoint.y, ctx.obstacles, excludeNodeIds,
  );

  const vObstacle = segmentIntersectsObstacle(
    bendPoint.x, bendPoint.y, target.x, target.y, ctx.obstacles, excludeNodeIds,
  );

  if (!hObstacle && !vObstacle) {
    return [source, bendPoint, target];
  }

  // Gorizontal segment obstacle ni kesib o'tadi — oraliq channel orqali
  const midY = (source.y + target.y) / 2;
  const channelY = findFreeHorizontalChannel(
    ctx, source.x, target.x, midY, excludeNodeIds,
  );

  if (channelY !== null) {
    return [
      source,
      { x: source.x, y: channelY },
      { x: target.x, y: channelY },
      target,
    ];
  }

  // Fallback
  return [source, bendPoint, target];
}
