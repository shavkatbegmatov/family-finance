import { useState, useEffect } from 'react';
import { Circle, Keyboard, ExternalLink } from 'lucide-react';
import { LATEST_VERSION } from '../../data/changelog';
import { useUIStore } from '../../store/uiStore';
import clsx from 'clsx';

export function Footer() {
  const year = new Date().getFullYear();
  const [currentTime, setCurrentTime] = useState(new Date());
  const setWhatsNewOpen = useUIStore((state) => state.setWhatsNewOpen);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('uz-UZ', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <footer className="hidden shrink-0 border-t border-base-200/60 bg-base-100/90 backdrop-blur-sm lg:block">
      {/* Desktop Footer */}
      <div className="px-6 py-2.5">
        <div className="flex items-center justify-between">
          {/* Left section - Brand & Copyright */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded bg-gradient-to-br from-primary to-primary/70">
                <span className="text-[8px] font-bold text-primary-content">FF</span>
              </div>
              <span className="text-xs font-medium text-base-content/70">Family Finance</span>
            </div>
            <div className="h-3 w-px bg-base-300" />
            <span className="text-[11px] text-base-content/50">© {year} Barcha huquqlar himoyalangan</span>
          </div>

          {/* Center section - Quick Links */}
          <div className="flex items-center gap-1">
            <a
              href="#"
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-base-content/50 transition-colors hover:bg-base-200 hover:text-base-content"
            >
              <Keyboard className="h-3 w-3" />
              Klaviatura
              <kbd className="kbd kbd-xs scale-90 bg-base-200">?</kbd>
            </a>
            <a
              href="#"
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-base-content/50 transition-colors hover:bg-base-200 hover:text-base-content"
            >
              Yordam
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
            <a
              href="mailto:support@familyfinance.uz"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md px-2 py-1 text-[11px] text-base-content/50 transition-colors hover:bg-base-200 hover:text-base-content"
            >
              Qo'llab-quvvatlash
            </a>
          </div>

          {/* Right section - Status & Version */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Circle className="h-1.5 w-1.5 fill-success text-success animate-pulse" />
              <span className="text-[11px] text-base-content/50">Tizim faol</span>
            </div>
            <div className="h-3 w-px bg-base-300" />
            <span className="text-[11px] tabular-nums text-base-content/40">{formatTime(currentTime)}</span>
            <div className="h-3 w-px bg-base-300" />
            <button
              onClick={() => setWhatsNewOpen(true)}
              title="Nima yangiliklar?"
              className={clsx(
                "flex items-center gap-1 rounded-full px-2 py-0.5 transition-colors cursor-pointer",
                "bg-base-200/50 hover:bg-primary/10 hover:text-primary active:scale-95"
              )}
            >
              <span className="text-[9px] font-medium uppercase tracking-wider text-base-content/40">v</span>
              <span className="text-[11px] font-semibold text-primary">{LATEST_VERSION}</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
