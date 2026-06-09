import { Boxes } from 'lucide-react';
import { useFamilyTreeStore } from '../../../../store/familyTreeStore';

/** WebGL mavjud bo'lmaganda (eski qurilma/WebView) ko'rsatiladi. */
export function WebGLFallback() {
  const setVisualMode = useFamilyTreeStore((s) => s.setVisualMode);
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
      <Boxes className="h-12 w-12 text-base-content/20" />
      <div>
        <p className="text-base font-medium">3D ko&apos;rinish qo&apos;llab-quvvatlanmaydi</p>
        <p className="mt-1 max-w-md text-sm text-base-content/50">
          Qurilmangiz yoki brauzeringiz WebGL&apos;ni qo&apos;llab-quvvatlamaydi.
          Iltimos, 2D ko&apos;rinishdan foydalaning.
        </p>
      </div>
      <button type="button" className="btn btn-primary btn-sm" onClick={() => setVisualMode('2d')}>
        2D ko&apos;rinishga qaytish
      </button>
    </div>
  );
}

export default WebGLFallback;
