import { useCallback, useRef } from 'react';

interface UseLongPressOptions {
  onLongPress: (e: React.TouchEvent) => void;
  delay?: number;
}

export function useLongPress({ onLongPress, delay = 500 }: UseLongPressOptions) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);
  const startPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const clear = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    isLongPress.current = false;
    const touch = e.touches[0];
    startPos.current = { x: touch.clientX, y: touch.clientY };

    timeoutRef.current = setTimeout(() => {
      isLongPress.current = true;
      onLongPress(e);
    }, delay);
  }, [onLongPress, delay]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - startPos.current.x);
    const dy = Math.abs(touch.clientY - startPos.current.y);
    // 10px dan ko'p harakatlansa — scroll, longpress emas
    if (dx > 10 || dy > 10) {
      clear();
    }
  }, [clear]);

  const onTouchEnd = useCallback(() => {
    clear();
  }, [clear]);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    isLongPress,
  };
}
