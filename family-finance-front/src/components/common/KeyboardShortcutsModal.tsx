import { Keyboard, X } from 'lucide-react';
import { ModalPortal } from './Modal';

interface ShortcutItem {
  keys: readonly string[];
  description: string;
}

interface ShortcutGroup {
  title: string;
  items: readonly ShortcutItem[];
}

const SHORTCUT_GROUPS: readonly ShortcutGroup[] = [
  {
    title: 'Umumiy',
    items: [
      { keys: ['Ctrl', 'N'], description: 'Yangi tranzaksiya' },
      { keys: ['Ctrl', 'K'], description: 'Tezkor qidiruv' },
      { keys: ['/'], description: 'Qidiruv' },
      { keys: ['?'], description: 'Klaviatura yorliqlari' },
      { keys: ['Esc'], description: 'Modalni yopish' },
    ],
  },
  {
    title: 'Navigatsiya',
    items: [
      { keys: ['G', 'D'], description: 'Dashboard' },
      { keys: ['G', 'T'], description: 'Tranzaksiyalar' },
      { keys: ['G', 'A'], description: 'Hisoblar' },
      { keys: ['G', 'B'], description: 'Byudjetlar' },
      { keys: ['G', 'R'], description: 'Hisobotlar' },
    ],
  },
];

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="w-full max-w-md bg-base-100 rounded-2xl shadow-2xl">
        <div className="p-4 sm:p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
                <Keyboard className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Klaviatura yorliqlari</h3>
                <p className="text-xs text-base-content/60">Tezroq ishlash uchun</p>
              </div>
            </div>
            <button
              className="btn btn-ghost btn-sm btn-square"
              onClick={onClose}
              aria-label="Yopish"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4">
            {SHORTCUT_GROUPS.map((group) => (
              <div key={group.title}>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                  {group.title}
                </h4>
                <div className="space-y-1.5">
                  {group.items.map((item) => (
                    <div
                      key={item.description}
                      className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-base-200/50"
                    >
                      <span className="text-sm text-base-content/80">{item.description}</span>
                      <div className="flex items-center gap-1">
                        {item.keys.map((k, i) => (
                          <span key={`${item.description}-${k}-${i}`} className="flex items-center gap-1">
                            <kbd className="kbd kbd-sm">{k}</kbd>
                            {i < item.keys.length - 1 && (
                              <span className="text-xs text-base-content/40">+</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-4 text-xs text-base-content/50">
            Maslahat: yorliqlar matn maydonchasida fokus bo'lganda ishlamaydi.
          </p>
        </div>
      </div>
    </ModalPortal>
  );
}
