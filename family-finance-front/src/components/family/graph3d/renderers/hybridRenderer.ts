import * as THREE from 'three';
import SpriteText from 'three-spritetext';
import type { GraphNode } from '../types';
import type { NodeRenderer, RenderCtx } from './NodeRenderer';
import { avatarsRenderer } from './avatarsRenderer';

// "Hibrid": THREE.LOD — yaqinda avatar, uzoqda kichik shar + yorliq.
// three renderer kamera masofasiga qarab har kadrda avtomatik almashtiradi.
const FAR_THRESHOLD = 90;

export const hybridRenderer: NodeRenderer = {
  kind: 'hybrid',
  extend: false,
  build(node: GraphNode, ctx: RenderCtx): THREE.Object3D {
    const lod = new THREE.LOD();

    // Yaqin daraja — avatar (avatarsRenderer'ni qayta ishlatish, DRY)
    lod.addLevel(avatarsRenderer.build(node, ctx), 0);

    // Uzoq daraja — rangli shar + ism
    const far = new THREE.Group();
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(4, 16, 16),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(ctx.colorOf(node)),
        transparent: true,
        opacity: node.deceased ? 0.5 : 1,
      }),
    );
    far.add(sphere);
    const label = new SpriteText(node.label, 4, ctx.theme.label);
    label.material.depthWrite = false;
    label.material.transparent = true;
    label.position.set(0, 7, 0);
    far.add(label);
    lod.addLevel(far, FAR_THRESHOLD);

    return lod;
  },
};
