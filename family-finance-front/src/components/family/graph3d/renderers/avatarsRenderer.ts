import * as THREE from 'three';
import type { GraphNode } from '../types';
import type { NodeRenderer, RenderCtx } from './NodeRenderer';
import { getInitial } from '../../flow/nodes/personCardUtils';
import { makeFocusMarker } from './focusMarker';

// "Avatarlar": billboard-sprite (rasm yoki initsial) + jins rangli disk-halqa.
const SIZE = 12;

function genderColor(node: GraphNode, ctx: RenderCtx): string {
  return node.gender === 'MALE'
    ? ctx.theme.male
    : node.gender === 'FEMALE'
      ? ctx.theme.female
      : ctx.theme.unknown;
}

export const avatarsRenderer: NodeRenderer = {
  kind: 'avatars',
  extend: false, // default sharni almashtiradi
  build(node: GraphNode, ctx: RenderCtx): THREE.Object3D {
    const group = new THREE.Group();
    const marker = makeFocusMarker(node, ctx);
    if (marker) group.add(marker);

    const ringColor = node.deceased ? '#9ca3af' : genderColor(node, ctx);

    // Orqa fon — jins rangli disk-halqa
    const ringMat = new THREE.SpriteMaterial({
      map: ctx.textures.discTexture(),
      color: new THREE.Color(ringColor),
      transparent: true,
      opacity: node.deceased ? 0.5 : 0.9,
      depthWrite: false,
    });
    const ring = new THREE.Sprite(ringMat);
    ring.scale.set(SIZE * 1.2, SIZE * 1.2, 1);
    ring.position.z = -0.5;
    group.add(ring);

    // Doiraviy avatar (rasm async yuklanadi, dastlab initsial ko'rinadi)
    const tex = ctx.textures.avatar({
      url: node.avatar,
      initial: getInitial(node.label),
      bg: genderColor(node, ctx),
    });
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      opacity: node.deceased ? 0.55 : 1,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(SIZE, SIZE, 1);
    group.add(sprite);

    return group;
  },
};
