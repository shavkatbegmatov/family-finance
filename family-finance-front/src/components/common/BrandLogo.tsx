import { useId } from 'react';
import clsx from 'clsx';

/**
 * Family Finance brend belgisi (mark).
 *
 * Konsepsiya: yumaloq squircle ichida o'sib boruvchi moliyaviy grafik chizig'i
 * — "oila boyligining o'sishi" ramzi. Teal→emerald gradient moliya va
 * o'sishni, oq strelka esa ijobiy harakatni bildiradi. Belgi har qanday
 * o'lchamda (favicon'dan tortib splash'gacha) toza ko'rinadi.
 */
interface BrandMarkProps {
  /** Piksel o'lchami (kvadrat). */
  size?: number;
  className?: string;
  /** Yumshoq tashqi glow soyasi qo'shish. */
  glow?: boolean;
}

export function BrandMark({ size = 40, className, glow = false }: BrandMarkProps) {
  // Bir nechta nusxa bir sahifada bo'lsa gradient ID'lari to'qnashmasligi uchun.
  const uid = useId().replace(/:/g, '');
  const gradId = `bm-grad-${uid}`;
  const glossId = `bm-gloss-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={clsx(glow && 'drop-shadow-[0_8px_20px_rgba(15,118,110,0.45)]', className)}
      role="img"
      aria-label="Family Finance"
    >
      <defs>
        <linearGradient id={gradId} x1="6" y1="3" x2="42" y2="45" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22c8b6" />
          <stop offset="0.55" stopColor="#0f9488" />
          <stop offset="1" stopColor="#0c6e64" />
        </linearGradient>
        <linearGradient id={glossId} x1="24" y1="2" x2="24" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffffff" stopOpacity="0.28" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Squircle korpus + ustki yorug'lik */}
      <rect x="2" y="2" width="44" height="44" rx="13.5" fill={`url(#${gradId})`} />
      <rect x="2" y="2" width="44" height="44" rx="13.5" fill={`url(#${glossId})`} />

      {/* O'sish grafigi chizig'i */}
      <path
        d="M13 31.5 L20 25 L27 29 L35 17"
        stroke="#ffffff"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Strelka uchi (yuqori-o'ng) */}
      <path
        d="M29.5 17 H35 V22.5"
        stroke="#ffffff"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Boshlang'ich nuqta (tanga) */}
      <circle cx="13" cy="31.5" r="2.4" fill="#ffffff" fillOpacity="0.9" />
    </svg>
  );
}

/**
 * To'liq brend logotipi: belgi + so'z-belgi (wordmark).
 */
interface BrandLogoProps {
  size?: number;
  /** Pastki kichik izoh ("Oilaviy moliya boshqaruvi"). */
  subtitle?: string;
  /** Faqat belgini ko'rsatish (wordmark'siz). */
  markOnly?: boolean;
  className?: string;
  /** Wordmark matni rangi uchun qo'shimcha klass (masalan oq fonli joylar). */
  titleClassName?: string;
}

export function BrandLogo({
  size = 40,
  subtitle,
  markOnly = false,
  className,
  titleClassName,
}: BrandLogoProps) {
  return (
    <div className={clsx('flex items-center gap-3', className)}>
      <BrandMark size={size} />
      {!markOnly && (
        <div className="min-w-0 leading-tight">
          <div
            className={clsx(
              'font-display text-[15px] font-extrabold tracking-tight',
              titleClassName
            )}
          >
            Family<span className="text-primary"> Finance</span>
          </div>
          {subtitle && (
            <p className="truncate text-[11px] font-medium text-base-content/55">{subtitle}</p>
          )}
        </div>
      )}
    </div>
  );
}
