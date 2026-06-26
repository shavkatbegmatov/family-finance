import { User, Phone, Calendar, MapPin } from 'lucide-react';

import { calculateAge, formatDate } from '../../config/constants';
import { formatPhoneDisplay } from '../../utils/phone';
import type { FamilyMember } from '../../types';
import { getGenderGradient, InfoRow } from './memberDetailShared';

/**
 * Overview tabidagi profil kartasi — avatar/gradient, ism qatlamlari va
 * tug'ilgan sana/joy/telefon/username InfoRow'lari. Original OverviewTab ichidagi
 * "Profile Card" bloki AYNAN.
 */
export function ProfileSummaryCard({ profile }: { profile: FamilyMember }) {
  const age = calculateAge(profile.birthDate);

  return (
    <div className="surface-card p-4 lg:p-5 lg:col-span-1">
      <div className="flex items-center gap-4 mb-4">
        <div
          className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${getGenderGradient(profile.gender)} text-white text-2xl font-bold shadow-lg`}
        >
          {profile.avatar ? (
            <img src={profile.avatar} alt={profile.fullName} className="h-16 w-16 rounded-2xl object-cover" />
          ) : (
            profile.fullName?.charAt(0).toUpperCase()
          )}
        </div>
        <div>
          <h3 className="text-lg font-bold">{profile.firstName}</h3>
          {profile.lastName && <p className="text-sm text-base-content/60">{profile.lastName}</p>}
          {profile.middleName && <p className="text-xs italic text-base-content/60">{profile.middleName}</p>}
        </div>
      </div>
      <div className="space-y-3">
        {profile.birthDate && (
          <InfoRow icon={Calendar} label="Tug'ilgan sana" value={`${formatDate(profile.birthDate)}${age !== null ? ` (${age} yosh)` : ''}`} />
        )}
        {profile.birthPlace && (
          <InfoRow icon={MapPin} label="Tug'ilgan joy" value={profile.birthPlace} />
        )}
        {profile.phone && (
          <InfoRow icon={Phone} label="Telefon" value={formatPhoneDisplay(profile.phone)} />
        )}
        {profile.userName && (
          <InfoRow icon={User} label="Username" value={`@${profile.userName}`} />
        )}
      </div>
    </div>
  );
}
