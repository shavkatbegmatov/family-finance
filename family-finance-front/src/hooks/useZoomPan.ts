import { useState, useCallback, useRef, type RefObject } from 'react';

const MIN_SCALE = 0.3;
const MAX_SCALE = 2.0;
const ZOOM_STEP = 0.1;

interface Position {
  x: number;
  y: number;
}

export function useZoomPan(_containerRef: RefObject<HTMLDivElement | null>) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const lastMouse = useRef<Position>({ x: 0, y: 0 });

  const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

  const zoomIn = useCallback(() => {
    setScale(prev => clampScale(prev + ZOOM_STEP));
  }, []);

  const zoomOut = useCallback(() => {
    setScale(prev => clampScale(prev - ZOOM_STEP));
  }, []);

  const resetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      setScale(prev => clampScale(prev + delta));
    }
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    // Faqat chap tugma bilan drag
    if (e.button !== 0) return;
    isDragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    setPosition(prev => ({ x: prev.x + dx, y: prev.y + dy }));
  }, []);

  const onMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const onMouseLeave = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handlers = {
    onWheel,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onMouseLeave,
  };

  return {
    scale,
    setScale,
    position,
    setPosition,
    handlers,
    zoomIn,
    zoomOut,
    resetZoom,
  };
}
