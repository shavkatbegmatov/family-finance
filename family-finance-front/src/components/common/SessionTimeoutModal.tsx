import { AlertTriangle, Clock } from 'lucide-react';
import { ModalPortal } from './Modal';

interface SessionTimeoutModalProps {
  isOpen: boolean;
  remainingSeconds: number;
  onContinue: () => void;
  onLogout: () => void;
}

export function SessionTimeoutModal({
  isOpen,
  remainingSeconds,
  onContinue,
  onLogout,
}: SessionTimeoutModalProps) {
  return (
    <ModalPortal isOpen={isOpen} onClose={() => {}}>
      <div className="w-full max-w-md rounded-2xl bg-base-100 p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-warning/15 text-warning">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">Sessiya tugash arafasida</h3>
            <p className="mt-2 text-sm text-base-content/70">
              Harakatsizlik tufayli sessiyangiz{' '}
              <span className="font-semibold text-warning">{remainingSeconds}</span>{' '}
              soniyadan so&apos;ng tugaydi. Davom etasizmi?
            </p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-base-200 px-3 py-2 text-xs text-base-content/70">
              <Clock className="h-4 w-4" />
              Oxirgi 30 daqiqada faol harakat aniqlanmadi
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button className="btn btn-ghost flex-1" onClick={onLogout}>
            Chiqish
          </button>
          <button className="btn btn-primary flex-1" onClick={onContinue}>
            Davom etish
          </button>
        </div>
      </div>
    </ModalPortal>
  );
}
