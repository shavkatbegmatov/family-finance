import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { Building2, X, Plus } from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { banksApi, type Bank, type BankRequest } from '../../api/banks.api';

interface BankFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingBank?: Bank | null;
}

export function BankFormModal({ isOpen, onClose, editingBank }: BankFormModalProps) {
    const queryClient = useQueryClient();
    const [binTags, setBinTags] = useState<string[]>([]);
    const [currentBinInput, setCurrentBinInput] = useState('');

    const { register, handleSubmit, reset, control, formState: { errors } } = useForm<BankRequest>({
        defaultValues: {
            name: '',
            shortName: '',
            mfo: '',
            logoUrl: '',
            isActive: true,
        }
    });

    useEffect(() => {
        if (isOpen) {
            if (editingBank) {
                reset({
                    name: editingBank.name,
                    shortName: editingBank.shortName,
                    mfo: editingBank.mfo,
                    logoUrl: editingBank.logoUrl,
                    isActive: editingBank.isActive,
                });
                setBinTags(editingBank.binPrefixes || []);
            } else {
                reset({
                    name: '',
                    shortName: '',
                    mfo: '',
                    logoUrl: '',
                    isActive: true,
                });
                setBinTags([]);
            }
            setCurrentBinInput('');
        }
    }, [isOpen, editingBank, reset]);

    const mutation = useMutation({
        mutationFn: async (data: BankRequest) => {
            const payload = { ...data, binPrefixes: binTags };
            if (editingBank) {
                return banksApi.update(editingBank.id, payload);
            }
            return banksApi.create(payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['banks'] });
            toast.success(editingBank ? "Bank muvaffaqiyatli saqlandi" : "Yangi bank qo'shildi");
            onClose();
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || "Xatolik yuz berdi");
        }
    });

    const onSubmit = (data: BankRequest) => {
        if (!data.name.trim()) return;
        mutation.mutate(data);
    };

    const handleAddBin = () => {
        const val = currentBinInput.trim();
        if (val && !binTags.includes(val) && /^[0-9]+$/.test(val)) {
            setBinTags([...binTags, val]);
            setCurrentBinInput('');
        }
    };

    const handleRemoveBin = (bin: string) => {
        setBinTags(binTags.filter(b => b !== bin));
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-2 text-primary">
                    <Building2 className="h-6 w-6" />
                    {editingBank ? "Bank ma'lumotlarini tahrirlash" : "Yangi bank yaratish"}
                </div>
            }
        >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
                <div className="form-control">
                    <label className="label">
                        <span className="label-text">Bank nomi</span>
                    </label>
                    <input
                        type="text"
                        className={`input input-bordered w-full ${errors.name ? 'input-error' : ''}`}
                        placeholder="Masalan: Kapitalbank ATS"
                        {...register("name", { required: "Bank nomi majburiy" })}
                    />
                    {errors.name && (
                        <label className="label">
                            <span className="label-text-alt text-error">{errors.name.message}</span>
                        </label>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">Qisqacha nomi</span>
                        </label>
                        <input
                            type="text"
                            className="input input-bordered w-full"
                            placeholder="Kapitalbank"
                            {...register("shortName")}
                        />
                    </div>

                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">Bank MFO</span>
                        </label>
                        <input
                            type="text"
                            className="input input-bordered w-full"
                            placeholder="MFO kod (ixtiyoriy)"
                            {...register("mfo")}
                        />
                    </div>
                </div>

                <div className="form-control">
                    <label className="label">
                        <span className="label-text">Bank Logotipi URL manzili</span>
                    </label>
                    <input
                        type="text"
                        className="input input-bordered w-full"
                        placeholder="https://..."
                        {...register("logoUrl")}
                    />
                </div>

                <div className="card bg-base-200/50 p-4 rounded-xl border border-base-300">
                    <label className="text-sm font-semibold mb-2 block">BIN Kodlar / Bog'lamalar</label>
                    <p className="text-xs text-base-content/60 mb-3">
                        Karta raqamining dastlabki raqamlarini kiriitng (BIN - Bank Identifier Number).
                        Bu bankni avtomatik aniqlashda juda yordam beradi. (Masalan, Agrobank Uzcard: "860004")
                    </p>

                    <div className="flex gap-2">
                        <input
                            type="text"
                            className="input input-bordered flex-1"
                            placeholder="BIN masalan: 860012"
                            value={currentBinInput}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentBinInput(e.target.value)}
                            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddBin();
                                }
                            }}
                        />
                        <button type="button" onClick={handleAddBin} className="btn btn-primary btn-square" title="BIN qo'shish">
                            <Plus className="h-5 w-5" />
                        </button>
                    </div>

                    {binTags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-4">
                            {binTags.map(bin => (
                                <div key={bin} className="badge badge-info gap-1 badge-lg h-8 px-3 font-mono">
                                    {bin}
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveBin(bin)}
                                        className="hover:text-error ml-1 focus:outline-none focus:ring-2 rounded-full p-0.5"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="pt-2">
                    <Controller
                        name="isActive"
                        control={control}
                        render={({ field }) => (
                            <div className="form-control flex flex-row items-center gap-3 cursor-pointer" onClick={() => field.onChange(!field.value)}>
                                <input
                                    type="checkbox"
                                    className="checkbox"
                                    checked={field.value}
                                    onChange={field.onChange}
                                />
                                <span className="label-text font-medium select-none text-base">Faol bank (ro'yxatlarda qatnashadi)</span>
                            </div>
                        )}
                    />
                </div>

                <div className="modal-action border-t border-base-200 pt-4 mt-6">
                    <button type="button" onClick={onClose} disabled={mutation.isPending} className="btn btn-ghost">
                        Bekor qilish
                    </button>
                    <button type="submit" disabled={mutation.isPending} className="btn btn-primary">
                        {mutation.isPending ? <span className="loading loading-spinner loading-sm"></span> : "Saqlash"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
