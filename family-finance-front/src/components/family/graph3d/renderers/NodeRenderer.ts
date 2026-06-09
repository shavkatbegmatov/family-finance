import type * as THREE from 'three';
import type { GraphNode, GraphTheme, RendererKind } from '../types';
import type { TextureCache } from './textureCache';
import { galaxyRenderer } from './galaxyRenderer';
import { avatarsRenderer } from './avatarsRenderer';
import { hybridRenderer } from './hybridRenderer';

/** Renderer'larga uzatiladigan kontekst (mavzu, rang-funksiya, tekstura keshi). */
export interface RenderCtx {
  theme: GraphTheme;
  colorOf: (node: GraphNode) => string;
  textures: TextureCache;
}

/** Almashtiriladigan tugun-render moduli uchun umumiy interfeys. */
export interface NodeRenderer {
  kind: RendererKind;
  /** true → kutubxona default shari saqlanadi va obyekt ustiga qo'shiladi (nodeThreeObjectExtend). */
  extend: boolean;
  build(node: GraphNode, ctx: RenderCtx): THREE.Object3D;
}

export const RENDERERS: Record<RendererKind, NodeRenderer> = {
  galaxy: galaxyRenderer,
  avatars: avatarsRenderer,
  hybrid: hybridRenderer,
};
