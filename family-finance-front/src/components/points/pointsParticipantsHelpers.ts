// Ball ishtirokchilari sahifasi uchun umumiy form tiplari, boshlang'ich
// holatlar va validatsiya yordamchilari. PointsParticipantsPage refaktorida
// ajratildi (D10 naqshi) — xulq AYNAN bir xil.

import type { Gender } from '../../types';

// ---------- Ishtirokchi form tipi ----------

export interface ParticipantFormState {
  firstName: string;
  lastName: string;
  nickname: string;
  birthDate: string;
}

export const emptyForm: ParticipantFormState = {
  firstName: '',
  lastName: '',
  nickname: '',
  birthDate: '',
};

// ---------- Inline oila a'zosi form tipi (link modal ichidan) ----------

export interface InlineMemberFormState {
  firstName: string;
  lastName: string;
  gender: Gender | '';
  birthDate: string;
}

export const emptyInlineMemberForm: InlineMemberFormState = {
  firstName: '',
  lastName: '',
  gender: '',
  birthDate: '',
};

// ---------- Validatsiya yordamchilari ----------

/**
 * Bog'lash/uzish sababi uchun minimal belgi soni. Original PointsParticipantsPage
 * mantig'i bilan AYNAN bir xil (qayta bog'lash va uzish sababi ≥10 belgi).
 */
export const LINK_REASON_MIN_LENGTH = 10;

/** Sabab matni majburiy minimal uzunlikni qondiradimi (trim qilingan holda). */
export function isReasonValid(reason: string): boolean {
  return reason.trim().length >= LINK_REASON_MIN_LENGTH;
}
