import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface ZoomControlsProps {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

export function ZoomControls({ scale, onZoomIn, onZoomOut, onReset }: ZoomControlsProps) {
  return (
    <div className="flex items-center gap-1 bg-base-200 rounded-lg p-1">
      <button
        className="btn btn-ghost btn-xs btn-square"
        onClick={onZoomOut}
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
        onClick={onZoomIn}
        title="Kattalashtirish"
        disabled={scale >= 2}
      >
        <ZoomIn className="h-3.5 w-3.5" />
      </button>
      <button
        className="btn btn-ghost btn-xs btn-square"
        onClick={onReset}
        title="Qaytarish"
      >
        <RotateCcw className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
