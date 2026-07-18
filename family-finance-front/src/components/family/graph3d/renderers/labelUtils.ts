import SpriteText from 'three-spritetext';
import type { GraphNode } from '../types';
import type { RenderCtx } from './NodeRenderer';

/**
 * Uzun ismni 3D canvas yorlig'i uchun qisqartiradi. To'liq ism hover tooltip
 * va qidiruvda qoladi.
 */
export function shortLabel(name: string, max = 18): string {
  const trimmed = name.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}...`;
}

const LABEL_HEIGHT = 2.2;
const ACTIVE_LABEL_HEIGHT = 2.45;

function labelOffsetY(node: GraphNode, ctx: RenderCtx): number {
  if (ctx.isActiveNode(node)) return node.kind === 'household' ? 25 : 22;
  if (ctx.isRootNode(node)) return 17;
  const degreeOffset = Math.min(node.degree ?? 0, 8) * 0.45;
  return 8.5 + degreeOffset;
}

export function makeGraphLabel(node: GraphNode, ctx: RenderCtx): SpriteText {
  const active = ctx.isActiveNode(node);
  const root = ctx.isRootNode(node);
  const label = new SpriteText(
    shortLabel(node.label, active ? 26 : 18),
    active ? ACTIVE_LABEL_HEIGHT : LABEL_HEIGHT,
    ctx.theme.label,
  );

  label.fontFace = 'Manrope, sans-serif';
  label.fontWeight = active ? '700' : '600';
  label.backgroundColor = active ? 'rgba(15, 23, 42, 0.9)' : 'rgba(6, 10, 20, 0.78)';
  label.padding = active ? [0.5, 0.26] : [0.42, 0.22];
  label.borderWidth = active ? 0.08 : 0.04;
  label.borderRadius = 0.28;
  label.borderColor = active ? '#facc15' : root ? ctx.theme.root : 'rgba(148, 163, 184, 0.42)';
  label.strokeWidth = 1.5;
  label.strokeColor = '#020617';
  label.material.depthWrite = false;
  label.material.depthTest = false;
  label.material.transparent = true;
  label.material.opacity = node.deceased ? 0.58 : 0.96;
  label.position.set(0, labelOffsetY(node, ctx), 0);
  label.renderOrder = 100;
  return label;
}
