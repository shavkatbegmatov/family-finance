import * as THREE from 'three';
import type { GraphNode } from '../types';
import type { NodeRenderer, RenderCtx } from './NodeRenderer';
import { avatarsRenderer } from './avatarsRenderer';
import { makeGraphLabel } from './labelUtils';
import { makeFocusMarker } from './focusMarker';

// "Hibrid": kamera masofasiga qarab avatar, badge-label yoki kichik shar ko'rsatadi.
const NEAR = 0;
const MID = 120;
const FAR = 220;
const HYSTERESIS = 0.12;

function makeSphere(node: GraphNode, ctx: RenderCtx, radius: number): THREE.Mesh {
  return new THREE.Mesh(
    new THREE.SphereGeometry(radius, 16, 16),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(ctx.colorOf(node)),
      transparent: true,
      opacity: node.deceased ? 0.5 : 1,
    }),
  );
}

export const hybridRenderer: NodeRenderer = {
  kind: 'hybrid',
  extend: false,
  build(node: GraphNode, ctx: RenderCtx): THREE.Object3D {
    const lod = new THREE.LOD();

    lod.addLevel(avatarsRenderer.build(node, ctx), NEAR, HYSTERESIS);

    const mid = new THREE.Group();
    const midMarker = makeFocusMarker(node, ctx);
    if (midMarker) mid.add(midMarker);
    mid.add(makeSphere(node, ctx, 4));
    if (ctx.showLabel(node)) mid.add(makeGraphLabel(node, ctx));
    lod.addLevel(mid, MID, HYSTERESIS);

    const far = new THREE.Group();
    const farMarker = makeFocusMarker(node, ctx);
    if (farMarker) far.add(farMarker);
    far.add(makeSphere(node, ctx, 3));
    lod.addLevel(far, FAR, HYSTERESIS);

    return lod;
  },
};
