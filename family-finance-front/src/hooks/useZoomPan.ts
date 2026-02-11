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

  // Touch state
  const lastTouchDistance = useRef<number | null>(null);
  const lastTouchCenter = useRef<Position | null>(null);
  const isTouchDragging = useRef(false);

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

  // ====== MOUSE HANDLERS ======

  const onWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      setScale(prev => clampScale(prev + delta));
    }
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
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

  // ====== TOUCH HANDLERS ======

  const getTouchDistance = (touches: React.TouchList): number => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getTouchCenter = (touches: React.TouchList): Position => {
    if (touches.length < 2) {
      return { x: touches[0].clientX, y: touches[0].clientY };
    }
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    };
  };

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch-to-zoom start
      e.preventDefault();
      lastTouchDistance.current = getTouchDistance(e.touches);
      lastTouchCenter.current = getTouchCenter(e.touches);
      isTouchDragging.current = false;
    } else if (e.touches.length === 1) {
      // Single finger drag
      isTouchDragging.current = true;
      lastTouchCenter.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDistance.current !== null) {
      // Pinch-to-zoom
      e.preventDefault();
      const newDistance = getTouchDistance(e.touches);
      const scaleDiff = (newDistance - lastTouchDistance.current) * 0.005;
      lastTouchDistance.current = newDistance;
      setScale(prev => clampScale(prev + scaleDiff));

      // Pan while pinching
      const newCenter = getTouchCenter(e.touches);
      if (lastTouchCenter.current) {
        const dx = newCenter.x - lastTouchCenter.current.x;
        const dy = newCenter.y - lastTouchCenter.current.y;
        setPosition(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      }
      lastTouchCenter.current = newCenter;
    } else if (e.touches.length === 1 && isTouchDragging.current && lastTouchCenter.current) {
      // Single finger drag-to-pan
      const dx = e.touches[0].clientX - lastTouchCenter.current.x;
      const dy = e.touches[0].clientY - lastTouchCenter.current.y;
      lastTouchCenter.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      setPosition(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    lastTouchDistance.current = null;
    lastTouchCenter.current = null;
    isTouchDragging.current = false;
  }, []);

  const handlers = {
    onWheel,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onMouseLeave,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
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
