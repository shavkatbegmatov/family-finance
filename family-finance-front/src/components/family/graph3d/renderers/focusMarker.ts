import * as THREE from 'three';
import type { GraphNode } from '../types';
import type { RenderCtx } from './NodeRenderer';

const ACTIVE_COLOR = '#facc15';
const ACTIVE_SCALE = 17;
const ROOT_SCALE = 14;

export function makeFocusMarker(node: GraphNode, ctx: RenderCtx): THREE.Sprite | null {
  const active = ctx.isActiveNode(node);
  const root = ctx.isRootNode(node);
  if (!active && !root) return null;

  const marker = new THREE.Sprite(new THREE.SpriteMaterial({
    map: ctx.textures.ringTexture(),
    color: new THREE.Color(active ? ACTIVE_COLOR : ctx.theme.root),
    transparent: true,
    opacity: active ? 0.95 : 0.7,
    depthWrite: false,
    depthTest: false,
  }));
  const scale = active ? ACTIVE_SCALE : ROOT_SCALE;
  marker.scale.set(scale, scale, 1);
  marker.position.z = -0.75;
  marker.renderOrder = 20;
  return marker;
}
