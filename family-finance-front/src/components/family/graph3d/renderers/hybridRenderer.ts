import * as THREE from 'three';
import SpriteText from 'three-spritetext';
import type { GraphNode } from '../types';
import type { NodeRenderer, RenderCtx } from './NodeRenderer';
import { avatarsRenderer } from './avatarsRenderer';

// "Hibrid": THREE.LOD — kamera masofasiga qarab 3 daraja avtomatik almashinadi.
//   NEAR  → avatar (boy, lekin og'ir)
//   MID   → rangli shar + ism
//   FAR   → faqat kichik shar (eng yengil)
// HYSTERESIS chegarada miltillashni (flicker) kamaytiradi.
const NEAR = 0;
const MID = 60;
const FAR = 140;
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

function makeLabel(node: GraphNode, ctx: RenderCtx): SpriteText {
  const label = new SpriteText(node.label, 4, ctx.theme.label);
  label.material.depthWrite = false;
  label.material.transparent = true;
  label.position.set(0, 7, 0);
  return label;
}

export const hybridRenderer: NodeRenderer = {
  kind: 'hybrid',
  extend: false,
  build(node: GraphNode, ctx: RenderCtx): THREE.Object3D {
    const lod = new THREE.LOD();

    // Yaqin — avatar (avatarsRenderer'ni qayta ishlatamiz, DRY)
    lod.addLevel(avatarsRenderer.build(node, ctx), NEAR, HYSTERESIS);

    // O'rta — rangli shar + (label LOD ruxsat bersa) ism
    const mid = new THREE.Group();
    mid.add(makeSphere(node, ctx, 4));
    if (ctx.showLabel(node)) mid.add(makeLabel(node, ctx));
    lod.addLevel(mid, MID, HYSTERESIS);

    // Uzoq — faqat kichik shar (eng yengil)
    lod.addLevel(makeSphere(node, ctx, 3), FAR, HYSTERESIS);

    return lod;
  },
};
