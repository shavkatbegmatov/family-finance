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

interface UseFamilyMemberOptionsParams {
  excludeIds?: number[];
  familyGroupId?: number;
}

export function useFamilyMemberOptions(params?: UseFamilyMemberOptionsParams) {
  const excludeIds = params?.excludeIds;
  const familyGroupId = params?.familyGroupId;

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
      .filter((m) =>
        m.isActive &&
        !excluded.has(m.id) &&
        (familyGroupId == null || m.familyGroupId === familyGroupId)
      )
      .map((m) => ({
        value: m.id,
        label: m.fullName || `${m.firstName} ${m.lastName ?? ''}`.trim(),
        description: ROLE_LABELS[m.role] ?? m.role,
      }));
  }, [members, excludeIds, familyGroupId]);

  return { options, isLoading };
}
