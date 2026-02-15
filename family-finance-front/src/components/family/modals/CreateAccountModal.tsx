import { useState } from 'react';
import { KeyRound, Copy, Check, Eye, EyeOff, ClipboardCopy, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { ModalPortal } from '../../common/Modal';
import { familyMembersApi } from '../../../api/family-members.api';
import { useQueryClient } from '@tanstack/react-query';
import type { CredentialsInfo, FamilyMember } from '../../../types';

interface CreateAccountModalProps {
  isOpen: boolean;
  personId: number;
  personName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateAccountModal({
  isOpen,
  personId,
  personName,
  onClose,
  onSuccess,
}: CreateAccountModalProps) {
  const queryClient = useQueryClient();

  // Form state
  const [accountRole, setAccountRole] = useState<string>('MEMBER');
  const [accountPassword, setAccountPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Credentials display state
  const [credentials, setCredentials] = useState<CredentialsInfo | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error('Nusxalashda xatolik');
    }
  };

  const handleCreate = async () => {
    setIsLoading(true);
    try {
      // Avval person ma'lumotlarini yuklaymiz
      const personRes = await familyMembersApi.getById(personId);
      const person = personRes.data.data as FamilyMember;

      // Update bilan createAccount yuboramiz
      const res = await familyMembersApi.update(personId, {
        firstName: person.firstName,
        lastName: person.lastName,
        middleName: person.middleName,
        role: person.role,
        gender: person.gender,
        birthDate: person.birthDate,
        birthPlace: person.birthPlace,
        deathDate: person.deathDate,
        phone: person.phone,
        avatar: person.avatar,
        userId: person.userId,
        createAccount: true,
        accountRole,
        accountPassword: accountPassword.trim() || undefined,
      });

      const updated = res.data.data as FamilyMember;
      if (updated.credentials) {
        setCredentials(updated.credentials);
        // Invalidate tree queries
        await queryClient.invalidateQueries({ queryKey: ['familyTree'] });
        await queryClient.invalidateQueries({ queryKey: ['labeledTree'] });
        await queryClient.invalidateQueries({ queryKey: ['familyMembers'] });
      } else {
        toast.error("Akkaunt yaratishda kutilmagan xatolik");
      }
    } catch (err) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      toast.error(axiosErr?.response?.data?.message || "Akkaunt yaratishda xatolik yuz berdi");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (credentials) {
      onSuccess();
    }
    onClose();
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={handleClose}>
      <div className="w-full max-w-md bg-base-100 rounded-2xl shadow-2xl">
        <div className="p-4 sm:p-6">
          {!credentials ? (
            // =========== Yaratish formasi ===========
            <>
              <div className="text-center mb-6">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <KeyRound className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Akkaunt yaratish</h3>
                <p className="text-sm text-base-content/60 mt-1">
                  <span className="font-medium text-base-content">{personName}</span> uchun tizimga kirish imkoniyati
                </p>
              </div>

              <div className="space-y-4">
                {/* Rol tanlash */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Rol</span>
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={`btn btn-sm flex-1 ${accountRole === 'MEMBER' ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => setAccountRole('MEMBER')}
                    >
                      A'zo
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm flex-1 ${accountRole === 'ADMIN' ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => setAccountRole('ADMIN')}
                    >
                      Admin
                    </button>
                  </div>
                </div>

                {/* Parol */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Parol</span>
                    <span className="label-text-alt text-base-content/40">Ixtiyoriy</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered input-sm w-full"
                    placeholder="Bo'sh qolsa avtomatik generatsiya"
                    value={accountPassword}
                    onChange={(e) => setAccountPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button className="btn btn-ghost btn-sm" onClick={handleClose}>
                  Bekor qilish
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleCreate}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <KeyRound className="h-4 w-4" />
                  )}
                  Yaratish
                </button>
              </div>
            </>
          ) : (
            // =========== Credentials ko'rsatish ===========
            <>
              <div className="text-center mb-6">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
                  <KeyRound className="h-7 w-7 text-success" />
                </div>
                <h3 className="text-xl font-semibold">Kirish ma'lumotlari</h3>
                <p className="text-sm text-base-content/60 mt-1">
                  {credentials.message}
                </p>
              </div>

              <div className="space-y-3">
                {/* Username */}
                <div className="bg-base-200 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-base-content/50 font-medium">Login</p>
                    <p className="font-mono font-semibold text-lg">{credentials.username}</p>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleCopyToClipboard(credentials.username, 'username')}
                    title="Nusxa olish"
                  >
                    {copiedField === 'username' ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {/* Password */}
                <div className="bg-base-200 rounded-lg p-3 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-base-content/50 font-medium">
                      {credentials.mustChangePassword ? 'Vaqtinchalik parol' : 'Parol'}
                    </p>
                    <p className="font-mono font-semibold text-lg">
                      {showPassword
                        ? credentials.temporaryPassword
                        : '\u2022'.repeat(credentials.temporaryPassword?.length || 8)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setShowPassword(!showPassword)}
                      title={showPassword ? 'Yashirish' : "Ko'rsatish"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleCopyToClipboard(credentials.temporaryPassword, 'password')}
                      title="Nusxa olish"
                    >
                      {copiedField === 'password' ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Copy All */}
              <button
                className="btn btn-outline btn-sm w-full mt-3"
                onClick={() =>
                  handleCopyToClipboard(
                    `Login: ${credentials.username}\nParol: ${credentials.temporaryPassword}`,
                    'all'
                  )
                }
              >
                {copiedField === 'all' ? (
                  <>
                    <Check className="h-4 w-4 text-success" />
                    Nusxalandi!
                  </>
                ) : (
                  <>
                    <ClipboardCopy className="h-4 w-4" />
                    Hammasini nusxalash
                  </>
                )}
              </button>

              <div className="alert alert-warning mt-4">
                <span className="text-sm">
                  Bu ma'lumotlar faqat bir marta ko'rsatiladi. Oila a'zosiga yetkazing!
                </span>
              </div>

              <div className="mt-6 flex justify-end">
                <button className="btn btn-primary" onClick={handleClose}>
                  Tushunarli
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}
