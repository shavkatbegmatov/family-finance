import { useState, useEffect, useCallback, type RefObject } from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';

interface ZoomControlsProps {
  flowContainerRef: RefObject<HTMLDivElement | null>;
}

export function ZoomControls(_props: ZoomControlsProps) {
  const { zoomIn, zoomOut, fitView, getZoom } = useReactFlow();
  const [scale, setScale] = useState(1);

  const updateScale = useCallback(() => {
    try {
      setScale(getZoom());
    } catch {
      // ReactFlow not yet initialized
    }
  }, [getZoom]);

  useEffect(() => {
    const interval = setInterval(updateScale, 300);
    return () => clearInterval(interval);
  }, [updateScale]);

  const handleZoomIn = () => {
    void zoomIn({ duration: 200 });
    setTimeout(updateScale, 250);
  };

  const handleZoomOut = () => {
    void zoomOut({ duration: 200 });
    setTimeout(updateScale, 250);
  };

  const handleFitView = () => {
    void fitView({ duration: 300, padding: 0.2 });
    setTimeout(updateScale, 350);
  };

  return (
    <div className="flex items-center gap-1 bg-base-200 rounded-lg p-1">
      <button
        className="btn btn-ghost btn-xs btn-square"
        onClick={handleZoomOut}
        title="Kichiklashtirish"
        disabled={scale <= 0.3}
      >
        <ZoomOut className="h-3.5 w-3.5" />
      </button>
      <span className="text-xs font-mono w-10 text-center text-base-content/60">
        {Math.round(scale * 100)}%
      </span>
      <button
        className="btn btn-ghost btn-xs btn-square"
        onClick={handleZoomIn}
        title="Kattalashtirish"
        disabled={scale >= 2}
      >
        <ZoomIn className="h-3.5 w-3.5" />
      </button>
      <button
        className="btn btn-ghost btn-xs btn-square"
        onClick={handleFitView}
        title="Ekranga sig'dirish"
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
