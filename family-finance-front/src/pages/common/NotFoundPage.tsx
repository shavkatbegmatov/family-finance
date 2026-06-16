import { Link } from 'react-router-dom';
import { Home, Compass } from 'lucide-react';
import { BrandMark } from '../../components/common/BrandLogo';

/**
 * Branded 404 — noto'g'ri URL ochilganda. Avval wildcard route jimgina bosh
 * sahifaga redirect qilardi (foydalanuvchi nima bo'lganini bilmasdi).
 */
export function NotFoundPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center">
      <BrandMark size={56} glow />
      <p className="mt-6 font-display text-6xl font-extrabold tracking-tight text-primary">404</p>
      <h1 className="mt-2 text-xl font-bold">Sahifa topilmadi</h1>
      <p className="mt-1 max-w-sm text-sm text-base-content/60">
        Siz qidirgan sahifa mavjud emas yoki ko'chirilgan bo'lishi mumkin.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Link to="/" className="btn btn-primary gap-2">
          <Home className="h-4 w-4" />
          Bosh sahifaga
        </Link>
        <Link to="/transactions" className="btn btn-ghost gap-2">
          <Compass className="h-4 w-4" />
          Tranzaksiyalar
        </Link>
      </div>
    </div>
  );
}
