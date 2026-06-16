import { useEffect } from 'react';
import { useRouteError, useNavigate, isRouteErrorResponse } from 'react-router-dom';
import { RefreshCw, Home, AlertTriangle } from 'lucide-react';
import { BrandMark } from '../../components/common/BrandLogo';

/**
 * Route-darajadagi xato chegarasi (createBrowserRouter errorElement).
 *
 * Avval route ichidagi render xatosi yoki deploy'dan keyin eskirgan lazy-chunk
 * xatosi react-router'ning xom inglizcha "Unexpected Application Error!" +
 * stack-trace ekranini ko'rsatardi (foydalanuvchiga tushunarsiz, "Qayta
 * yuklash" tugmasisiz). Endi: brendlangan, o'zbekcha, qayta-yuklash tugmali
 * ekran; chunk-load xatosida (yangi deploy → eski hash'li chunk) AVTOMATIK
 * bir marta reload qilinadi.
 */
export function RouteErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();

  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : String(error ?? '');

  // Chunk-load / dynamic import xatosi — odatda yangi deploy'dan keyin brauzer
  // eski index.html'dagi o'chirilgan chunk'ni so'raydi. Bir marta avtomatik
  // reload (sessiyaga belgilab, cheksiz loop bo'lmasligi uchun).
  const isChunkError = /dynamically imported module|Importing a module script failed|ChunkLoadError|Failed to fetch/i
    .test(message);

  useEffect(() => {
    if (isChunkError && !sessionStorage.getItem('ff-chunk-reloaded')) {
      sessionStorage.setItem('ff-chunk-reloaded', '1');
      window.location.reload();
    }
  }, [isChunkError]);

  if (isChunkError && !sessionStorage.getItem('ff-chunk-reloaded')) {
    // Reload qilinmoqda — bo'sh ekran (flash oldini olish)
    return null;
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center">
      <BrandMark size={52} />
      <div className="mt-5 grid h-12 w-12 place-items-center rounded-2xl bg-error/10 text-error">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h1 className="mt-4 text-xl font-bold">Nimadir xato ketdi</h1>
      <p className="mt-1 max-w-sm text-sm text-base-content/60">
        Kutilmagan xatolik yuz berdi. Sahifani qayta yuklab ko'ring — muammo
        davom etsa, birozdan so'ng qayta urinib ko'ring.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => {
            sessionStorage.removeItem('ff-chunk-reloaded');
            window.location.reload();
          }}
          className="btn btn-primary gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Qayta yuklash
        </button>
        <button type="button" onClick={() => navigate('/')} className="btn btn-ghost gap-2">
          <Home className="h-4 w-4" />
          Bosh sahifaga
        </button>
      </div>
    </div>
  );
}
