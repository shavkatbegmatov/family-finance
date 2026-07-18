import SpriteText from 'three-spritetext';
import { Group } from 'three';
import type { Object3D } from 'three';
import type { GraphNode } from '../types';
import type { NodeRenderer, RenderCtx } from './NodeRenderer';
import { shortLabel } from './labelUtils';
import { makeFocusMarker } from './focusMarker';

// "Galaktika": kutubxona default shari (rangi `nodeColor` orqali) + ustida ism yorlig'i.
const LABEL_HEIGHT = 2.2;

export const galaxyRenderer: NodeRenderer = {
  kind: 'galaxy',
  extend: true, // default shar saqlanadi
  build(node: GraphNode, ctx: RenderCtx): Object3D {
    const group = new Group();
    const marker = makeFocusMarker(node, ctx);
    if (marker) group.add(marker);

    // Katta grafda faqat markaziy (hub) tugunlar yorliqlanadi — label LOD.
    if (!ctx.showLabel(node)) return group;
    const label = new SpriteText(shortLabel(node.label), LABEL_HEIGHT, ctx.theme.label);
    label.fontFace = 'Manrope, sans-serif';
    label.fontWeight = '600';
    // To'q kontur — bloom (glow) ostida ham ism aniq o'qiladi.
    label.strokeWidth = 5;
    label.strokeColor = '#05070d';
    label.material.depthWrite = false;
    label.material.transparent = true;
    label.material.opacity = node.deceased ? 0.5 : 0.92;
    label.position.set(0, 7, 0);
    label.renderOrder = 10;
    group.add(label);
    return group;
  },
};
