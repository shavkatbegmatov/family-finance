import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { familyMembersApi } from '../api/family-members.api';
import type { FamilyMember, ApiResponse } from '../types';
import type { ComboBoxOption } from '../components/ui/ComboBox';

const ROLE_LABELS: Record<string, string> = {
  FATHER: 'Ota',
  MOTHER: 'Ona',
  CHILD: 'Farzand',
  OTHER: 'Boshqa',
};

export function useFamilyMemberOptions(excludeIds?: number[]) {
  const { data: members = [], isLoading } = useQuery({
    queryKey: ['family-members', 'list'],
    queryFn: async () => {
      const res = await familyMembersApi.getList();
      return (res.data as ApiResponse<FamilyMember[]>).data ?? res.data ?? [];
    },
  });

  const options: ComboBoxOption[] = useMemo(() => {
    const excluded = new Set(excludeIds ?? []);
    return (members as FamilyMember[])
      .filter((m) => m.isActive && !excluded.has(m.id))
      .map((m) => ({
        value: m.id,
        label: m.fullName || `${m.firstName} ${m.lastName ?? ''}`.trim(),
        description: ROLE_LABELS[m.role] ?? m.role,
      }));
  }, [members, excludeIds]);

  return { options, isLoading };
}
