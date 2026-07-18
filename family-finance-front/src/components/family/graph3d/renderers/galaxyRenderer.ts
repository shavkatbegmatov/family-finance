import { Group } from 'three';
import type { Object3D } from 'three';
import type { GraphNode } from '../types';
import type { NodeRenderer, RenderCtx } from './NodeRenderer';
import { makeGraphLabel } from './labelUtils';
import { makeFocusMarker } from './focusMarker';

// "Galaktika": kutubxona default shari saqlanadi, ustiga marker va badge-label chiqadi.
export const galaxyRenderer: NodeRenderer = {
  kind: 'galaxy',
  extend: true,
  build(node: GraphNode, ctx: RenderCtx): Object3D {
    const group = new Group();
    const marker = makeFocusMarker(node, ctx);
    if (marker) group.add(marker);

    if (ctx.showLabel(node)) group.add(makeGraphLabel(node, ctx));
    return group;
  },
};
