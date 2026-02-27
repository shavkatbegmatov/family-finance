import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Shield, UserPlus, Trash2, Users, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { familyGroupApi } from '../../api/family-group.api';
import type { FamilyGroupMemberDto, FamilyGroupResponse } from '../../api/family-group.api';
import { TextInput } from '../../components/ui/TextInput';
import { useAuthStore } from '../../store/authStore';
import { ModalPortal } from '../../components/common/Modal';
import type { ApiResponse } from '../../types';

interface AddressHistoryItem {
    id: number;
    address: string;
    moveInDate: string;
    moveOutDate?: string;
    isCurrent: boolean;
}

export function FamilyGroupSettings() {
    const navigate = useNavigate();
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

    const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [newAddress, setNewAddress] = useState('');
    const [moveInDate, setMoveInDate] = useState('');
    const [moveOutDate, setMoveOutDate] = useState('');

    const { data: addressHistory, isLoading: isLoadingHistory } = useQuery({
        queryKey: ['addressHistory'],
        queryFn: async () => {
            const res = await familyGroupApi.getAddressHistory();
            return (res.data as unknown as ApiResponse<AddressHistoryItem[]>).data;
        },
        enabled: isHistoryModalOpen,
    });

    const addressMutation = useMutation({
        mutationFn: familyGroupApi.changeAddress,
        onSuccess: () => {
            toast.success('Manzil muvaffaqiyatli saqlandi');
            queryClient.invalidateQueries({ queryKey: ['myFamilyGroup'] });
            queryClient.invalidateQueries({ queryKey: ['addressHistory'] });
            setIsAddressModalOpen(false);
            setNewAddress('');
            setMoveInDate('');
            setMoveOutDate('');
        },
        onError: (err: { response?: { data?: { message?: string } } }) => {
            toast.error(err.response?.data?.message || 'Manzilni saqlashda xatolik');
        },
    });

    const handleInvite = () => {
        if (!inviteUsername.trim()) return;
        inviteMutation.mutate(inviteUsername.trim());
    };

    const handleSaveAddress = () => {
        if (!newAddress.trim()) return;
        addressMutation.mutate({
            address: newAddress,
            moveInDate: moveInDate || undefined,
            moveOutDate: moveOutDate || undefined,
        });
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
            <div className="flex items-center gap-3">
                <button
                    className="btn btn-square btn-sm btn-ghost"
                    onClick={() => navigate('/my-family')}
                    title="Orqaga qaytish"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-xl font-bold">Guruh sozlamalari</h1>
            </div>

            <div className="surface-card p-6 border-l-4 border-l-primary flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold flex flex-wrap items-center gap-2">
                            <Users className="w-6 h-6 text-primary" />
                            {groupData.name}
                            {groupData.uniqueCode && (
                                <span className="badge badge-primary font-mono ml-2 gap-1 py-3 text-sm" title="Xo'jalikning noyob raqami">
                                    <span className="opacity-70">Kod:</span>
                                    {groupData.uniqueCode}
                                </span>
                            )}
                        </h2>
                        <p className="text-sm text-base-content/60 mt-2">
                            Bu guruh siz va siz taklif qilgan a'zolarni yagona uy xo'jaligi sifatida birlashtiradi. Oilaviy hisoblar shu yerdagi barcha a'zolarga ko'rinadi.
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

                {/* Address Section */}
                <div className="mt-4 pt-4 border-t border-base-200">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <span className="text-sm font-semibold opacity-60 uppercase tracking-wider block mb-1">Joriy Manzil</span>
                            <div className="text-lg font-medium text-base-content">
                                {groupData.currentAddress || <span className="text-base-content/40 italic">Manzil kiritilmagan</span>}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                className="btn btn-outline btn-sm"
                                onClick={() => setIsHistoryModalOpen(true)}
                            >
                                Manzillar tarixi
                            </button>
                            {isAdmin && (
                                <button
                                    className="btn btn-outline border-base-300 btn-sm"
                                    onClick={() => setIsAddressModalOpen(true)}
                                >
                                    Manzilni yangilash
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="surface-card p-0 overflow-hidden">
                <table className="table w-full">
                    <thead className="bg-base-200">
                        <tr>
                            <th className="pl-6">Ism</th>
                            <th>Login</th>
                            <th>Telefon</th>
                            <th className="text-right pr-6">Amallar</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-base-200">
                        {groupData.members?.map((m: FamilyGroupMemberDto) => {
                            const isMemberAdmin = m.userId === groupData.adminId;
                            return (
                                <tr key={m.id} className="hover">
                                    <td className="pl-6">
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
                                    <td className="text-right pr-6">
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

            {/* Update Address Modal */}
            <ModalPortal isOpen={isAddressModalOpen} onClose={() => setIsAddressModalOpen(false)}>
                <div className="w-full max-w-md bg-base-100 rounded-2xl shadow-2xl p-6">
                    <h3 className="font-bold text-lg mb-2">Manzilni yangilash</h3>
                    <p className="text-sm text-base-content/60 mb-6">
                        Yangi uy manzilini kiritishingiz mumkin. Oldingi manzillar manzillar tarixida saqlanib qoladi.
                    </p>

                    <div className="space-y-4">
                        <div className="form-control w-full">
                            <label className="label">
                                <span className="label-text font-medium text-base-content/80">Yangi Manzil</span>
                            </label>
                            <textarea
                                className="textarea textarea-bordered w-full resize-none h-24"
                                placeholder="To'liq manzilni kiriting..."
                                value={newAddress}
                                onChange={(e) => setNewAddress(e.target.value)}
                                disabled={addressMutation.isPending}
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="form-control w-full">
                                <label className="label">
                                    <span className="label-text font-medium text-base-content/80">Ko'chib kelish sanasi</span>
                                </label>
                                <input
                                    type="date"
                                    className="input input-bordered w-full"
                                    value={moveInDate}
                                    onChange={(e) => setMoveInDate(e.target.value)}
                                    disabled={addressMutation.isPending}
                                />
                            </div>
                            <div className="form-control w-full">
                                <label className="label">
                                    <span className="label-text font-medium text-base-content/80">Ko'chib ketish sanasi</span>
                                </label>
                                <input
                                    type="date"
                                    className="input input-bordered w-full"
                                    value={moveOutDate}
                                    onChange={(e) => setMoveOutDate(e.target.value)}
                                    disabled={addressMutation.isPending}
                                />
                            </div>
                        </div>
                        <p className="text-xs text-base-content/50 -mt-2">
                            Sanalar ixtiyoriy. Agar ko'chib ketish kiritilmasa, keyingi ko'chgan kuningizgacha yoki joriy davr deb hisoblanadi.
                        </p>
                    </div>

                    <div className="mt-6 flex justify-end gap-2">
                        <button
                            className="btn btn-ghost"
                            onClick={() => setIsAddressModalOpen(false)}
                            disabled={addressMutation.isPending}
                        >
                            Bekor qilish
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handleSaveAddress}
                            disabled={addressMutation.isPending || !newAddress.trim()}
                        >
                            {addressMutation.isPending && <span className="loading loading-spinner text-primary"></span>}
                            Saqlash
                        </button>
                    </div>
                </div>
            </ModalPortal>

            {/* Address History Modal */}
            <ModalPortal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)}>
                <div className="w-full max-w-xl bg-base-100 rounded-2xl shadow-2xl p-6">
                    <h3 className="font-bold text-lg mb-6 text-center">Xo'jalik manzillari tarixi</h3>

                    {isLoadingHistory ? (
                        <div className="flex justify-center py-8">
                            <span className="loading loading-spinner text-primary"></span>
                        </div>
                    ) : (
                        <div className="max-h-[60vh] overflow-x-hidden overflow-y-auto pr-2">
                            {(!addressHistory || addressHistory.length === 0) ? (
                                <p className="text-center text-base-content/50 py-4">Tarix topilmadi.</p>
                            ) : (
                                <ul className="steps steps-vertical w-full">
                                    {addressHistory.map((item: AddressHistoryItem) => (
                                        <li key={item.id} className={`step ${item.isCurrent ? "step-primary" : "step-neutral"} min-w-0`}>
                                            <div className="flex flex-col items-start text-left ml-4 bg-base-200 p-4 rounded-xl mb-4 w-[calc(100%-2rem)] max-w-[400px] break-words">
                                                <div className="font-medium text-[15px] max-w-full break-words">{item.address}</div>
                                                <div className="text-sm text-base-content/60 mt-2 flex flex-col sm:flex-row sm:gap-4">
                                                    <span>Kelgan: <strong className="text-base-content/80">{item.moveInDate}</strong></span>
                                                    {item.moveOutDate && (
                                                        <span>Ketgan: <strong className="text-base-content/80">{item.moveOutDate}</strong></span>
                                                    )}
                                                </div>
                                                {item.isCurrent && (
                                                    <span className="badge badge-success badge-sm mt-3">Hozirgi manzil</span>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}

                    <div className="mt-6 flex justify-end">
                        <button
                            className="btn btn-outline"
                            onClick={() => setIsHistoryModalOpen(false)}
                        >
                            Yopish
                        </button>
                    </div>
                </div>
            </ModalPortal>
        </div>
    );
}
