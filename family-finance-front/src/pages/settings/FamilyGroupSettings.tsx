import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, UserPlus, Trash2, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { familyGroupApi } from '../../api/family-group.api';
import type { FamilyGroupMemberDto, FamilyGroupResponse } from '../../api/family-group.api';
import { TextInput } from '../../components/ui/TextInput';
import { useAuthStore } from '../../store/authStore';
import { ModalPortal } from '../../components/common/Modal';
import type { ApiResponse } from '../../types';

export function FamilyGroupSettings() {
    const queryClient = useQueryClient();
    const currentUser = useAuthStore((s) => s.user);

    const [inviteUsername, setInviteUsername] = useState('');
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

    const { data: groupData, isLoading } = useQuery({
        queryKey: ['myFamilyGroup'],
        queryFn: async () => {
            const res = await familyGroupApi.getMyGroup();
            return (res.data as unknown as ApiResponse<FamilyGroupResponse>).data;
        },
    });

    const inviteMutation = useMutation({
        mutationFn: familyGroupApi.addMember,
        onSuccess: () => {
            toast.success('A\'zo muvaffaqiyatli qo\'shildi');
            queryClient.invalidateQueries({ queryKey: ['myFamilyGroup'] });
            setIsInviteModalOpen(false);
            setInviteUsername('');
        },
        onError: (err: { response?: { data?: { message?: string } } }) => {
            toast.error(err.response?.data?.message || 'Foydalanuvchini qo\'shishda xatolik');
        },
    });

    const removeMutation = useMutation({
        mutationFn: familyGroupApi.removeMember,
        onSuccess: () => {
            toast.success('A\'zo guruhdan chiqarildi');
            queryClient.invalidateQueries({ queryKey: ['myFamilyGroup'] });
        },
        onError: (err: { response?: { data?: { message?: string } } }) => {
            toast.error(err.response?.data?.message || 'Foydalanuvchini o\'chirishda xatolik');
        },
    });

    const handleInvite = () => {
        if (!inviteUsername.trim()) return;
        inviteMutation.mutate(inviteUsername.trim());
    };

    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <span className="loading loading-spinner loading-lg text-primary"></span>
            </div>
        );
    }

    if (!groupData) {
        return (
            <div className="surface-card p-6 text-center">
                <p className="text-base-content/60">Sizda guruh ma'lumotlari topilmadi.</p>
            </div>
        );
    }

    const isAdmin = groupData.adminId === currentUser?.id;

    return (
        <div className="space-y-6">
            <div className="surface-card p-6 border-l-4 border-l-primary flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Users className="w-6 h-6 text-primary" />
                        {groupData.name}
                    </h2>
                    <p className="text-sm text-base-content/60 mt-1">
                        Bu guruh siz va siz taklif qilgan a'zolarni yagona uy xo'jaligi sifatida birlashtiradi. Oilaviy hisoblar (Accounts) shu yerdagi barcha a'zolarga ko'rinadi.
                    </p>
                </div>
                {isAdmin && (
                    <button
                        className="btn btn-primary btn-sm shrink-0"
                        onClick={() => setIsInviteModalOpen(true)}
                    >
                        <UserPlus className="w-4 h-4" />
                        A'zo qo'shish
                    </button>
                )}
            </div>

            <div className="surface-card p-0 overflow-hidden">
                <table className="table w-full">
                    <thead className="bg-base-200">
                        <tr>
                            <th>Ism</th>
                            <th>Login</th>
                            <th>Telefon</th>
                            <th className="text-right">Amallar</th>
                        </tr>
                    </thead>
                    <tbody>
                        {groupData.members?.map((m: FamilyGroupMemberDto) => {
                            const isMemberAdmin = m.userId === groupData.adminId;
                            return (
                                <tr key={m.id} className="hover">
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <div className="font-medium flex items-center gap-2">
                                                {m.fullName}
                                                {isMemberAdmin && (
                                                    <span className="badge badge-warning badge-xs gap-1 py-2">
                                                        <Shield className="w-3 h-3" />
                                                        Admin
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="font-mono text-sm">{m.username}</td>
                                    <td>{m.phone || '-'}</td>
                                    <td className="text-right">
                                        {isAdmin && !isMemberAdmin && (
                                            <button
                                                className="btn btn-ghost btn-sm text-error"
                                                title="Guruhdan o'chirish"
                                                onClick={() => {
                                                    if (confirm("Rostdan ham ushbu foydalanuvchini guruhingizdan chiqarib yubormoqchimisiz?")) {
                                                        removeMutation.mutate(m.userId);
                                                    }
                                                }}
                                                disabled={removeMutation.isPending}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                        {(!groupData.members || groupData.members.length === 0) && (
                            <tr>
                                <td colSpan={4} className="text-center py-6 text-base-content/50">
                                    Hozircha guruhda faqat sizsiz.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Invite Modal */}
            <ModalPortal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)}>
                <div className="w-full max-w-sm bg-base-100 rounded-2xl shadow-2xl p-6">
                    <h3 className="font-bold text-lg mb-2">Yangi a'zo qo'shish</h3>
                    <p className="text-sm text-base-content/60 mb-6">
                        Yangi a'zo qo'shish uchun uning tizimdagi logini (username)ni kiriting. U sizning guruhga qo'shiladi va oilaviy byudjyetga ega bo'ladi.
                    </p>

                    <div className="space-y-4">
                        <TextInput
                            label="Foydalanuvchi logini"
                            placeholder="Masalan: 998901234567"
                            value={inviteUsername}
                            onChange={(val) => setInviteUsername(val)}
                            disabled={inviteMutation.isPending}
                        />
                    </div>

                    <div className="mt-6 flex justify-end gap-2">
                        <button
                            className="btn btn-ghost"
                            onClick={() => setIsInviteModalOpen(false)}
                            disabled={inviteMutation.isPending}
                        >
                            Bekor qilish
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handleInvite}
                            disabled={inviteMutation.isPending || !inviteUsername.trim()}
                        >
                            {inviteMutation.isPending && <span className="loading loading-spinner text-primary"></span>}
                            Qo'shish
                        </button>
                    </div>
                </div>
            </ModalPortal>
        </div>
    );
}
