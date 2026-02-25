import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Building2,
    Plus,
    Search,
    Edit2,
    BadgeCheck,
    XCircle,
    Activity
} from 'lucide-react';
import toast from 'react-hot-toast';
import { banksApi, type Bank } from '../../api/banks.api';
import { BankFormModal } from './BankFormModal';

export function BanksPage() {
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingBank, setEditingBank] = useState<Bank | null>(null);
    const queryClient = useQueryClient();

    const { data: banksResponse, isLoading, error } = useQuery({
        queryKey: ['banks', search, page],
        queryFn: () => banksApi.getAll(search, page, 100)
    });

    const toggleStatusMutation = useMutation({
        mutationFn: async (bank: Bank) => {
            return banksApi.update(bank.id, {
                name: bank.name,
                shortName: bank.shortName,
                mfo: bank.mfo,
                logoUrl: bank.logoUrl,
                isActive: !bank.isActive,
                binPrefixes: bank.binPrefixes
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['banks'] });
            toast.success("Bank holati o'zgartirildi");
        },
        onError: () => toast.error("Bank holatini o'zgartirishda xatolik yuz berdi")
    });

    if (error) {
        return <div className="alert alert-error">Tizim xatoligi: banklarni yuklash muvaffaqiyatsiz bo'ldi</div>;
    }

    const banks = banksResponse?.data?.content || [];

    const handleEdit = (bank: Bank) => {
        setEditingBank(bank);
        setIsAddModalOpen(true);
    };

    const handleAdd = () => {
        setEditingBank(null);
        setIsAddModalOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Building2 className="h-6 w-6 text-primary" />
                        Banklar tizimi
                    </h1>
                    <p className="text-sm text-base-content/60 mt-1">
                        Platformadagi barcha rasmiy banklar ro'yxati va ularning BIN bog'lamalari
                    </p>
                </div>
                <button onClick={handleAdd} className="btn btn-primary">
                    <Plus className="h-4 w-4 mr-2" /> Yangi bank
                </button>
            </div>

            {/* Search Header */}
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="w-full sm:max-w-xs relative">
                    <div className="relative">
                        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50" />
                        <input
                            type="text"
                            className="input input-bordered w-full pl-10"
                            placeholder="Bank nomi yoki MFO orqali izlash..."
                            value={search}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                setSearch(e.target.value);
                                setPage(0);
                            }}
                        />
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-12">
                    <span className="loading loading-spinner loading-lg text-primary"></span>
                </div>
            ) : banks.length === 0 ? (
                <div className="text-center py-12 text-base-content/60 bg-base-200/50 rounded-lg border-2 border-dashed border-base-300">
                    <Building2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>Hech narsa topilmadi</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="table">
                        <thead>
                            <tr>
                                <th className="w-16 text-center">Tasvir</th>
                                <th>Nomlanishi</th>
                                <th>MFO</th>
                                <th>BINs (Bog'lamalar)</th>
                                <th className="text-center">Holat</th>
                                <th className="text-right">Amallar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {banks.map(bank => (
                                <tr key={bank.id} className="hover:bg-base-200/30 transition-colors">
                                    <td>
                                        <div className="avatar">
                                            <div className="w-10 rounded-xl bg-base-200 shadow-sm border border-base-300 flex items-center justify-center text-primary/30 p-1">
                                                {bank.logoUrl ? (
                                                    <img src={bank.logoUrl} alt={bank.name} className="object-contain" />
                                                ) : (
                                                    <Building2 className="h-5 w-5 mx-auto my-auto mt-2.5" />
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="font-semibold text-base whitespace-nowrap">{bank.name}</div>
                                        {bank.shortName && (
                                            <div className="text-xs text-base-content/50 truncate max-w-[200px]">{bank.shortName}</div>
                                        )}
                                    </td>
                                    <td>
                                        <div className="badge badge-ghost font-mono text-xs">{bank.mfo || "Yo'q"}</div>
                                    </td>
                                    <td>
                                        <div className="flex flex-wrap gap-1 max-w-[280px]">
                                            {bank.binPrefixes && bank.binPrefixes.length > 0 ? (
                                                bank.binPrefixes.map((bin: string) => (
                                                    <span key={bin} className="badge badge-sm badge-info font-mono text-[10px]">{bin}</span>
                                                ))
                                            ) : (
                                                <span className="text-xs text-base-content/40 italic">Bin yo'q</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="text-center">
                                        {bank.isActive ? (
                                            <span className="badge badge-success badge-sm gap-1 pl-1">
                                                <BadgeCheck className="h-3 w-3" /> Faol
                                            </span>
                                        ) : (
                                            <span className="badge badge-error badge-sm gap-1 pl-1">
                                                <XCircle className="h-3 w-3" /> Nofaol
                                            </span>
                                        )}
                                    </td>
                                    <td className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => toggleStatusMutation.mutate(bank)}
                                                className="btn btn-ghost btn-xs btn-square text-base-content/70 hover:text-base-content/90 hover:bg-base-300"
                                                title={bank.isActive ? "Nofaol qilish" : "Faollashtirish"}
                                            >
                                                <Activity className={`h-4 w-4 ${bank.isActive ? "text-error" : "text-success"}`} />
                                            </button>
                                            <button
                                                onClick={() => handleEdit(bank)}
                                                className="btn btn-ghost btn-xs btn-square text-primary hover:bg-primary/10"
                                                title="Tahrirlash"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <BankFormModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                editingBank={editingBank}
            />
        </div>
    );
}
