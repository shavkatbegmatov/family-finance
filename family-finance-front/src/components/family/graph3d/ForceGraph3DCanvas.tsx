import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import type { ForceGraphMethods, LinkObject, NodeObject } from 'react-force-graph-3d';
import { Vector2 } from 'three';
import type { Material, Mesh, Object3D } from 'three';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import type { GraphData, GraphLink, GraphNode, GraphTheme, RendererKind } from './types';
import { RENDERERS, type RenderCtx } from './renderers/NodeRenderer';
import { createTextureCache } from './renderers/textureCache';

export interface ForceGraph3DCanvasProps {
  graphData: GraphData;
  theme: GraphTheme;
  colorOf: (node: GraphNode) => string;
  rendererKind: RendererKind;
  glow: boolean;
  fgRef: React.MutableRefObject<ForceGraphMethods<GraphNode, GraphLink> | undefined>;
  onNodeClick: (node: GraphNode) => void;
}

const PERF_LARGE = 600;

// Bloom (Neo4j Bloom / Obsidian uslubidagi node porlashi) parametrlari.
// Yumshoq glow — node'lar nozik porlaydi, ism yorliqlari o'qilmay qolmaydi.
const BLOOM_STRENGTH = 0.8;
const BLOOM_RADIUS = 0.5;
const BLOOM_THRESHOLD = 0.25;

// Label LOD: shuncha tugundan ko'p bo'lsa, faqat "hub" (ko'p bog'langan) tugunlar yorliqlanadi.
const LABEL_ALL_MAX = 60;
const HUB_DEGREE = 3;

function disposeObject(obj: Object3D): void {
  obj.traverse((o) => {
    const mesh = o as Mesh;
    // Geometriyani FAQAT Mesh uchun dispose qilamiz. Sprite/SpriteText butun ilova
    // bo'ylab YAGONA modul-darajali geometriyani ulashadi — uni dispose qilish
    // boshqa jonli sprite'larni buzadi (shared-geometry corruption).
    if (mesh.isMesh) mesh.geometry?.dispose?.();
    const mat = mesh.material as Material | Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
    else mat?.dispose?.();
  });
}

export function ForceGraph3DCanvas({
  graphData,
  theme,
  colorOf,
  rendererKind,
  glow,
  fgRef,
  onNodeClick,
}: ForceGraph3DCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const texturesRef = useRef<ReturnType<typeof createTextureCache> | null>(null);
  if (!texturesRef.current) texturesRef.current = createTextureCache();
  const bloomRef = useRef<UnrealBloomPass | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const renderer = RENDERERS[rendererKind];

  // Label LOD — kichik grafda barcha yorliqlar, katta grafda faqat markaziy (hub) tugunlar.
  const labelAll = graphData.nodes.length <= LABEL_ALL_MAX;
  const showLabel = useCallback(
    (node: GraphNode) => labelAll || (node.degree ?? 0) >= HUB_DEGREE,
    [labelAll],
  );

  const ctx = useMemo<RenderCtx>(
    () => ({ theme, colorOf, textures: texturesRef.current!, showLabel }),
    [theme, colorOf, showLabel],
  );

  // Accessor'larni barqarorlashtiramiz — aks holda har render'da (masalan o'lcham
  // o'zgarsa) barcha tugun-obyektlari behuda qayta quriladi.
  const nodeThreeObject = useCallback(
    (node: NodeObject) => renderer.build(node as GraphNode, ctx),
    [renderer, ctx],
  );
  const nodeColorFn = useCallback((node: NodeObject) => colorOf(node as GraphNode), [colorOf]);
  // Node o'lchami bog'lanishlar soniga qarab — markaziy shaxslar kattaroq ko'rinadi.
  const nodeValFn = useCallback(
    (node: NodeObject) => 1 + Math.min((node as GraphNode).degree ?? 0, 12) * 0.5,
    [],
  );
  const nodeLabelFn = useCallback((node: NodeObject) => (node as GraphNode).label, []);
  const linkColorFn = useCallback(() => theme.link, [theme.link]);
  // Juda katta grafda oqim zarralarini o'chiramiz (perf degrader).
  const heavyGraph = graphData.nodes.length > 800;
  const linkParticlesFn = useCallback(
    (link: LinkObject) => (heavyGraph || (link as GraphLink).rel === 'spouse' ? 0 : 2),
    [heavyGraph],
  );
  const handleHover = useCallback((node: NodeObject | null) => {
    const el = containerRef.current;
    if (el) el.style.cursor = node ? 'pointer' : 'grab';
  }, []);
  const handleClick = useCallback(
    (node: NodeObject) => onNodeClick(node as GraphNode),
    [onNodeClick],
  );

  // O'lchamni kuzatish (ForceGraph3D aniq width/height talab qiladi)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setSize({ width: Math.floor(r.width), height: Math.floor(r.height) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Renderer/mavzu/rang o'zgarsa — grafni qayta quramiz. Eski tugun obyektlarini
  // QO'LDA dispose QILMAYMIZ: 3d-force-graph refresh() ichida o'zi _deallocate
  // qiladi; qo'lda dispose ortiqcha bo'lib, sprite'larning umumiy geometriyasini
  // jonli sprite'lar ostidan tortib olar edi.
  useEffect(() => {
    fgRef.current?.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rendererKind, theme, colorOf]);

  // Bloom/glow — composer'ga UnrealBloomPass qo'shadi yoki oladi (o'lchamga sinxron)
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg || size.width === 0 || size.height === 0) return;
    const composer = fg.postProcessingComposer?.();
    if (!composer) return;
    if (glow) {
      if (!bloomRef.current) {
        const pass = new UnrealBloomPass(
          new Vector2(size.width, size.height),
          BLOOM_STRENGTH,
          BLOOM_RADIUS,
          BLOOM_THRESHOLD,
        );
        composer.addPass(pass);
        bloomRef.current = pass;
      } else {
        bloomRef.current.setSize(size.width, size.height);
      }
    } else if (bloomRef.current) {
      composer.removePass(bloomRef.current);
      bloomRef.current.dispose();
      bloomRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [glow, size.width, size.height]);

  // Unmount — three GPU resurslarini va teksturalarni tozalash
  useEffect(() => {
    const textures = texturesRef.current;
    const ref = fgRef;
    return () => {
      // Unmount paytidagi eng so'nggi graf instansiyasini tozalaymiz
      // (mount vaqtida fgRef hali bo'sh bo'ladi, shu sabab cleanup'da o'qiymiz).
      const fg = ref.current;
      try {
        fg?.pauseAnimation?.();
      } catch {
        /* noop */
      }
      fg?.scene?.()?.traverse((o) => disposeObject(o));
      bloomRef.current?.dispose();
      bloomRef.current = null;
      textures?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const n = graphData.nodes.length;

  return (
    <div ref={containerRef} className="absolute inset-0 cursor-grab">
      {size.width > 0 && size.height > 0 && (
        <>
          <ForceGraph3D
            ref={fgRef as never}
            width={size.width}
            height={size.height}
            graphData={graphData}
            backgroundColor={theme.background}
            showNavInfo={false}
            nodeRelSize={4}
            nodeVal={nodeValFn}
            nodeId="id"
            nodeLabel={nodeLabelFn}
            nodeColor={nodeColorFn}
            nodeThreeObjectExtend={renderer.extend}
            nodeThreeObject={nodeThreeObject}
            onNodeClick={handleClick}
            onNodeHover={handleHover}
            linkColor={linkColorFn}
            linkOpacity={0.4}
            linkWidth={0.5}
            linkDirectionalParticles={linkParticlesFn}
            linkDirectionalParticleSpeed={0.006}
            linkDirectionalParticleWidth={1.1}
            warmupTicks={Math.min(60, n)}
            cooldownTicks={n > PERF_LARGE ? 0 : undefined}
            cooldownTime={15000}
            enableNodeDrag={false}
          />
          {/* Deep-space chuqurlik: nozik teal/indigo nebula + chetlarni qoraytiruvchi
              vignette. Canvas ustida, lekin pointer-events YO'Q — klik/drag o'tadi. */}
          <div className="graph3d-depth pointer-events-none absolute inset-0" />
        </>
      )}
    </div>
  );
}

export default ForceGraph3DCanvas;
