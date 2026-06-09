import { useEffect, useState } from 'react';
import type { GraphTheme } from '../types';

// Jins ranglari 2D daraxt bilan izchil (personCardUtils.getGenderGradient).
const GENDER = { male: '#3b82f6', female: '#ec4899', unknown: '#f59e0b' } as const;

function rgbToHex(rgb: string): string | null {
  const m = rgb.match(/\d+(\.\d+)?/g);
  if (!m || m.length < 3) return null;
  const [r, g, b] = m.slice(0, 3).map((v) => Math.max(0, Math.min(255, Math.round(parseFloat(v)))));
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

/**
 * daisyUI rangini DOM orqali yechadi: berilgan utility-klassli yashirin element
 * yaratib, brauzer hisoblagan rang(rgb)ini o'qiydi. Bu hsl/oklch formatidan
 * qat'i nazar ishlaydi (brauzerning o'zi yechadi).
 */
function readClassColor(
  className: string,
  prop: 'color' | 'backgroundColor',
  fallback: string,
): string {
  if (typeof document === 'undefined') return fallback;
  const probe = document.createElement('div');
  probe.className = className;
  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  probe.style.pointerEvents = 'none';
  document.body.appendChild(probe);
  const resolved = getComputedStyle(probe)[prop];
  probe.remove();
  return (resolved && rgbToHex(resolved)) || fallback;
}

function readTheme(): GraphTheme {
  const isDark =
    typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-theme') === 'family-dark';
  return {
    background: readClassColor('bg-base-100', 'backgroundColor', isDark ? '#0b1220' : '#f8fafc'),
    nodeDefault: readClassColor('text-primary', 'color', '#14b8a6'),
    root: readClassColor('text-primary', 'color', '#14b8a6'),
    link: readClassColor('text-base-content', 'color', isDark ? '#94a3b8' : '#475569'),
    label: readClassColor('text-base-content', 'color', isDark ? '#e2e8f0' : '#1e293b'),
    male: GENDER.male,
    female: GENDER.female,
    unknown: GENDER.unknown,
    isDark,
  };
}

/** Joriy daisyUI mavzusidan GraphTheme; light/dark almashganda jonli yangilanadi. */
export function useGraphTheme(): GraphTheme {
  const [theme, setTheme] = useState<GraphTheme>(() => readTheme());

  useEffect(() => {
    // Mount'dan keyin qayta o'qish (SSR/birinchi paint farqi uchun).
    setTheme(readTheme());
    const observer = new MutationObserver(() => setTheme(readTheme()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  return theme;
}
