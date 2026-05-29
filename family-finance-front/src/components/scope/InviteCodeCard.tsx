import { useEffect, useState } from 'react';
import { Copy, RefreshCcw, Share2, Check, KeyRound, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { scopesApi } from '../../api/scopes.api';
import { useScopeStore } from '../../store/scopeStore';

/**
 * Joriy aktiv scope'ning taklif kodini ko'rsatadi va boshqaradi.
 * - OWNER yoki ADMIN ko'rishi mumkin (backend canManageScope tekshiradi)
 * - Nusxalash + WhatsApp orqali yuborish + yangilash
 * - Yangilash bosilganda eski kod buziladi
 */
export function InviteCodeCard() {
  const activeScope = useScopeStore((s) => s.activeScope);
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // Faqat OWNER/ADMIN invite kodni ko'ra/boshqara oladi. MEMBER/VIEWER bo'lsa
  // umuman so'rov yubormaymiz — aks holda backend 403 qaytaradi va keraksiz
  // "ruxsat yo'q" toast chiqadi.
  const canManage = activeScope?.currentUserRole === 'OWNER'
    || activeScope?.currentUserRole === 'ADMIN';

  useEffect(() => {
    if (!activeScope?.id || !canManage) {
      setLoading(false);
      setCode(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    scopesApi
      .getInviteCode(activeScope.id)
      .then((res) => {
        if (!cancelled) setCode(res.data.data.inviteCode);
      })
      .catch(() => {
        if (!cancelled) setError("Kod olinmadi");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeScope?.id, canManage]);

  // OWNER/ADMIN bo'lmasa — kartani umuman ko'rsatmaymiz
  if (!canManage) {
    return null;
  }

  const handleCopy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success('Kod nusxalandi');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Nusxalashda xatolik");
    }
  };

  const handleShare = () => {
    if (!code) return;
    const text = `Oila moliya tizimimizga qo'shilish uchun mana shu taklif kodidan foydalaning: ${code}\n\nRo'yxatdan o'tish: ${window.location.origin}/register`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleRegenerate = async () => {
    if (!activeScope?.id) return;
    if (!confirm("Eski kod buziladi. Davom etamizmi?")) return;
    setRegenerating(true);
    try {
      const res = await scopesApi.regenerateInviteCode(activeScope.id);
      setCode(res.data.data.inviteCode);
      toast.success('Yangi kod yaratildi');
    } catch {
      toast.error("Yangilashda xatolik");
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="surface-card p-5">
        <div className="skeleton h-4 w-32 mb-2" />
        <div className="skeleton h-10 w-full" />
      </div>
    );
  }

  if (error || !code) {
    return null; // Faqat OWNER/ADMIN uchun ko'rinadi
  }

  return (
    <div className="surface-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-base-200 px-5 py-4">
        <h3 className="flex items-center gap-2 font-semibold">
          <KeyRound className="h-5 w-5 text-warning" />
          Oila taklif kodi
        </h3>
        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className="btn btn-ghost btn-xs gap-1"
          title="Yangi kod yaratish (eski'sini bekor qilish)"
        >
          <RefreshCcw className={`h-3.5 w-3.5 ${regenerating ? 'animate-spin' : ''}`} />
          Yangilash
        </button>
      </div>
      <div className="p-5 space-y-3">
        <p className="text-sm text-base-content/60 flex items-start gap-2">
          <Users className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>
            Bu kodni oila a'zolaringizga yuboring. Ular ro'yxatdan o'tayotganda kodni kiritib,
            avtomatik shu oilaga MEMBER bo'lib qo'shiladi.
          </span>
        </p>
        <div className="flex items-center gap-2">
          <div className="flex-1 rounded-xl border-2 border-dashed border-base-300 bg-base-200/50 px-4 py-3 font-mono text-lg tracking-wider text-center select-all">
            {code}
          </div>
          <button onClick={handleCopy} className="btn btn-ghost btn-square" title="Nusxalash">
            {copied ? <Check className="h-5 w-5 text-success" /> : <Copy className="h-5 w-5" />}
          </button>
          <button onClick={handleShare} className="btn btn-primary gap-2" title="WhatsApp orqali yuborish">
            <Share2 className="h-4 w-4" />
            Ulashish
          </button>
        </div>
      </div>
    </div>
  );
}
