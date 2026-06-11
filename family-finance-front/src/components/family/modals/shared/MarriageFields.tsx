import { Select } from '../../../ui/Select';
import { DateInput } from '../../../ui/DateInput';
import { MARRIAGE_TYPES } from '../../../../config/constants';
import type { MarriageType } from '../../../../types';
import type { SelectOption } from '../../../ui/Select';

interface MarriageFieldsProps {
  marriageType: MarriageType;
  onMarriageTypeChange: (val: MarriageType) => void;
  marriageDate: string;
  onMarriageDateChange: (val: string) => void;
  /** inline: yonma-yon (grid, AddSpouse); aks holda "Nikoh" ajratgich bilan ustma-ust (AddParents). */
  inline?: boolean;
}

/**
 * Nikoh ma'lumotlari (turi + sanasi) bloki — AddSpouse/AddParents modallari orasidagi
 * takrorni bitta joyga jamlaydi (DRY).
 */
export function MarriageFields({
  marriageType,
  onMarriageTypeChange,
  marriageDate,
  onMarriageDateChange,
  inline = false,
}: MarriageFieldsProps) {
  const marriageTypeOptions: SelectOption[] = Object.entries(MARRIAGE_TYPES).map(
    ([key, { label }]) => ({ value: key, label })
  );

  const typeField = (
    <Select
      label="Nikoh turi"
      required
      value={marriageType}
      onChange={(val) => onMarriageTypeChange(val as MarriageType)}
      options={marriageTypeOptions}
    />
  );
  const dateField = (
    <DateInput label="Nikoh sanasi" value={marriageDate} onChange={onMarriageDateChange} />
  );

  if (inline) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {typeField}
        {dateField}
      </div>
    );
  }

  return (
    <>
      <div className="divider text-xs text-base-content/60">Nikoh</div>
      {typeField}
      {dateField}
    </>
  );
}
