import { User, Users, CheckCircle2 } from 'lucide-react';
import { TextInput } from '../../../ui/TextInput';
import { Select } from '../../../ui/Select';
import { PersonSelect } from '../../../ui/PersonSelect';
import { DateInput } from '../../../ui/DateInput';
import { GENDERS } from '../../../../config/constants';
import type { Gender } from '../../../../types';
import type { SelectOption } from '../../../ui/Select';

/** "Yangi yoki mavjud" shaxs tanlash formasi holati. Modallar shu yagona shaklni ishlatadi. */
export interface PersonDraft {
  mode: 'new' | 'existing';
  personId: number | '';
  firstName: string;
  lastName: string;
  middleName: string;
  gender: Gender | '';
  birthDate: string;
}

export const emptyPersonDraft: PersonDraft = {
  mode: 'new',
  personId: '',
  firstName: '',
  lastName: '',
  middleName: '',
  gender: '',
  birthDate: '',
};

/** Forma yuborishga tayyormi — barcha modallarda submit shartini izchil baholaydi. */
export function isPersonDraftValid(
  draft: PersonDraft,
  opts?: { genderRequired?: boolean },
): boolean {
  if (draft.mode === 'existing') return !!draft.personId;
  if (!draft.firstName.trim()) return false;
  if (opts?.genderRequired && !draft.gender) return false;
  return true;
}

const MAX_BIRTH_DATE = new Date().toISOString().slice(0, 10);

interface PersonPickerProps {
  value: PersonDraft;
  onChange: (next: PersonDraft) => void;
  personOptions: SelectOption[];
  /** full: familiya/otasining ismi/jins ham; compact: faqat ism va sana (jins tashqarida belgilanadi). */
  variant?: 'full' | 'compact';
  /** "Yangi shaxs" formasidagi ism yorlig'i va placeholder (masalan "Ota ismi"). */
  nameLabel?: string;
  namePlaceholder?: string;
  /** Berilsa — forma o'rniga qulflangan (mavjud, o'zgartirib bo'lmas) kartochka ko'rsatiladi. */
  lockedName?: string | null;
  /** "Yangi shaxs" rejimida jinsni majburiy qiladi (label '*' + isPersonDraftValid). */
  genderRequired?: boolean;
  /** Berilsa — jins shu qiymatga qulflanadi (masalan turmush o'rtoqning qarama-qarshi jinsi). */
  genderLocked?: Gender;
  /** Jins variantlari yorliqlarini almashtiradi (masalan farzand uchun O'g'il/Qiz). */
  genderLabels?: { MALE: string; FEMALE: string };
}

/**
 * "Yangi yoki mavjud shaxs" tanlash bloki — AddSpouse/AddChild/AddParents modallari
 * orasidagi takror formani bitta joyga jamlaydi (DRY). Controlled komponent:
 * holat {@link PersonDraft} sifatida tashqarida saqlanadi.
 */
export function PersonPicker({
  value,
  onChange,
  personOptions,
  variant = 'full',
  nameLabel = 'Ism',
  namePlaceholder = 'Ism',
  lockedName,
  genderRequired = false,
  genderLocked,
  genderLabels,
}: PersonPickerProps) {
  const patch = (partial: Partial<PersonDraft>) => onChange({ ...value, ...partial });

  if (lockedName) {
    return (
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-base-200/60 border border-base-300">
        <User className="h-5 w-5 text-base-content/50" />
        <span className="text-sm font-medium">{lockedName}</span>
        <span className="ml-auto flex items-center gap-1 text-xs text-success">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Mavjud
        </span>
      </div>
    );
  }

  const genderOptions: SelectOption[] = [
    { value: '', label: 'Tanlanmagan' },
    { value: 'MALE', label: genderLabels?.MALE ?? GENDERS.MALE.label },
    { value: 'FEMALE', label: genderLabels?.FEMALE ?? GENDERS.FEMALE.label },
  ];

  return (
    <div className="space-y-3">
      <div className="flex gap-1 bg-base-200 rounded-lg p-1">
        <button
          type="button"
          className={`btn btn-sm flex-1 gap-1 ${value.mode === 'new' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => patch({ mode: 'new' })}
        >
          <User className="h-4 w-4" />
          Yangi shaxs
        </button>
        <button
          type="button"
          className={`btn btn-sm flex-1 gap-1 ${value.mode === 'existing' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => patch({ mode: 'existing' })}
        >
          <Users className="h-4 w-4" />
          Mavjud shaxs
        </button>
      </div>

      {value.mode === 'existing' ? (
        <PersonSelect
          label="Shaxsni tanlang"
          required
          value={value.personId || undefined}
          onChange={(val: string | number | undefined) =>
            patch({ personId: typeof val === 'number' ? val : Number(val) || '' })
          }
          options={personOptions}
          placeholder="Shaxsni qidiring..."
        />
      ) : (
        <div className="space-y-2">
          <TextInput
            label={nameLabel}
            required
            value={value.firstName}
            onChange={(val) => patch({ firstName: val })}
            placeholder={namePlaceholder}
            leadingIcon={<User className="h-5 w-5" />}
          />
          {variant === 'full' && (
            <>
              <TextInput
                label="Familiya"
                value={value.lastName}
                onChange={(val) => patch({ lastName: val })}
                placeholder="Familiya"
              />
              <TextInput
                label="Otasining ismi"
                value={value.middleName}
                onChange={(val) => patch({ middleName: val })}
                placeholder="Otasining ismi"
              />
              <Select
                label={genderRequired || genderLocked ? 'Jinsi *' : 'Jinsi'}
                value={(genderLocked ?? value.gender) || undefined}
                onChange={(val) => patch({ gender: val as Gender })}
                options={genderOptions}
                disabled={!!genderLocked}
                placeholder={genderRequired ? 'Majburiy — tanlang' : 'Tanlang...'}
              />
            </>
          )}
          <DateInput
            label="Tug'ilgan sana"
            value={value.birthDate}
            onChange={(val) => patch({ birthDate: val })}
            max={MAX_BIRTH_DATE}
          />
        </div>
      )}
    </div>
  );
}
