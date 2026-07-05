import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, GraduationCap, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { schoolsApi } from '../../api/schools.api';
import { PageHeader } from '../../components/layout/PageHeader';
import { getApiErrorMessage } from '../../utils/apiError';
import type { Scope } from '../../types/scope.types';

const PENDING_QUERY_KEY = ['admin', 'schools', 'pending'];

/**
 * SUPER_ADMIN — maktab arizalarini ko'rish va tasdiqlash (ADR-002 P4, K3:
 * tekshiruvsiz maktab bolalar ro'yxatini yig'ish vektori bo'lar edi).
 */
export function AdminSchoolsPage() {
  const queryClient = useQueryClient();

  const { data: pending = [], isLoading } = useQuery({
    queryKey: PENDING_QUERY_KEY,
    queryFn: async () => (await schoolsApi.getPending()).data.data ?? [],
  });

  const approveMutation = useMutation({
    mutationFn: (school: Scope) => schoolsApi.approve(school.id),
    onSuccess: (_, school) => {
      toast.success(`"${school.name}" tasdiqlandi — egasi endi sinf ocha oladi`);
      queryClient.invalidateQueries({ queryKey: PENDING_QUERY_KEY });
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Tasdiqlashda xatolik')),
  });

  return (
    <div className="space-y-4 lg:space-y-6">
      <PageHeader
        title="Maktab arizalari"
        subtitle="Har bir maktab tasdiqdan o'tadi — bolalar ma'lumotlari xavfsizligi uchun"
      />

      {isLoading && (
        <div className="flex items-center gap-2 rounded-2xl bg-base-100 p-4 text-sm text-base-content/60 lg:p-5">
          <Loader2 className="h-4 w-4 animate-spin" /> Yuklanmoqda...
        </div>
      )}

      {!isLoading && pending.length === 0 && (
        <div className="rounded-2xl bg-base-100 p-8 text-center text-sm text-base-content/60">
          Tasdiq kutayotgan ariza yo'q.
        </div>
      )}

      {pending.length > 0 && (
        <div className="rounded-2xl bg-base-100 p-4 shadow-sm lg:p-5">
          <div className="divide-y divide-base-200">
            {pending.map((school) => (
              <div key={school.id} className="flex items-center gap-3 py-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-indigo-500/10 text-indigo-500">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{school.name}</span>
                  <span className="text-xs text-base-content/60">
                    Ariza beruvchi: {school.ownerUserName ?? '—'}
                    {typeof school.metadata?.description === 'string' &&
                      school.metadata.description.length > 0 &&
                      ` · ${school.metadata.description}`}
                  </span>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  disabled={approveMutation.isPending}
                  onClick={() => approveMutation.mutate(school)}
                >
                  {approveMutation.isPending && approveMutation.variables?.id === school.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Tasdiqlash
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
