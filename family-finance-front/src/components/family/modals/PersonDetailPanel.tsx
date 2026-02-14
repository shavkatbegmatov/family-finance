import {
  X,
  Calendar,
  MapPin,
  Phone,
  Users,
  Heart,
} from 'lucide-react';
import { ModalPortal } from '../../common/Modal';
import {
  useActivePersonsQuery,
  useFamilyUnitsByPersonQuery,
} from '../../../hooks/useFamilyTreeQueries';
import { formatDate, GENDERS, MARRIAGE_TYPES, LINEAGE_TYPES } from '../../../config/constants';

interface PersonDetailPanelProps {
  isOpen: boolean;
  personId: number;
  onClose: () => void;
}

export function PersonDetailPanel({
  isOpen,
  personId,
  onClose,
}: PersonDetailPanelProps) {
  const { data: activePersons = [] } = useActivePersonsQuery();
  const { data: familyUnits = [], isLoading: loadingUnits } =
    useFamilyUnitsByPersonQuery(personId);

  const person = activePersons.find((p) => p.id === personId);

  if (!isOpen) return null;

  const age =
    person?.birthDate
      ? Math.floor(
          (Date.now() - new Date(person.birthDate).getTime()) /
            (365.25 * 24 * 60 * 60 * 1000)
        )
      : null;

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="w-full max-w-md bg-base-100 rounded-2xl shadow-2xl">
        <div className="p-4 sm:p-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div
                className={`h-14 w-14 rounded-full flex items-center justify-center text-white text-xl font-bold ${
                  person?.gender === 'MALE'
                    ? 'bg-blue-500'
                    : person?.gender === 'FEMALE'
                    ? 'bg-pink-500'
                    : 'bg-gray-400'
                }`}
              >
                {person?.avatar ? (
                  <img
                    src={person.avatar}
                    alt={person.fullName}
                    className="h-14 w-14 rounded-full object-cover"
                  />
                ) : (
                  person?.fullName.charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <h3 className="text-xl font-semibold">{person?.fullName}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  {person?.gender && (
                    <span className="badge badge-sm badge-outline">
                      {GENDERS[person.gender]?.label}
                    </span>
                  )}
                  {person?.deathDate && (
                    <span className="badge badge-sm badge-ghost">Vafot etgan</span>
                  )}
                </div>
              </div>
            </div>
            <button className="btn btn-ghost btn-sm btn-square" onClick={onClose}>
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Info */}
          <div className="mt-4 space-y-2">
            {person?.birthDate && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-base-content/40" />
                <span>
                  {formatDate(person.birthDate)}
                  {age !== null && ` (${age} yosh)`}
                </span>
              </div>
            )}
            {person?.deathDate && (
              <div className="flex items-center gap-2 text-sm text-base-content/60">
                <Calendar className="h-4 w-4 text-base-content/40" />
                <span>Vafot: {formatDate(person.deathDate)}</span>
              </div>
            )}
            {person?.birthPlace && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-base-content/40" />
                <span>{person.birthPlace}</span>
              </div>
            )}
            {person?.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-base-content/40" />
                <span>{person.phone}</span>
              </div>
            )}
          </div>

          {/* Family Units */}
          {loadingUnits ? (
            <div className="flex justify-center py-4">
              <span className="loading loading-spinner loading-sm" />
            </div>
          ) : familyUnits.length > 0 ? (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-base-content/60 mb-2 flex items-center gap-1.5">
                <Heart className="h-3.5 w-3.5" />
                Nikohlar
              </h4>
              <div className="space-y-2">
                {familyUnits.map((fu) => {
                  const otherPartner = fu.partners.find(
                    (p) => p.personId !== personId
                  );
                  return (
                    <div
                      key={fu.id}
                      className="p-3 rounded-lg bg-base-200/50 text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {otherPartner?.fullName || '—'}
                        </span>
                        <span className="badge badge-xs">
                          {MARRIAGE_TYPES[fu.marriageType]?.label}
                        </span>
                      </div>
                      {fu.children.length > 0 && (
                        <div className="mt-1.5 flex items-center gap-1 text-xs text-base-content/50">
                          <Users className="h-3 w-3" />
                          {fu.children.map((c) => c.fullName).join(', ')}
                          {fu.children.map((c) => (
                            <span key={c.id} className="badge badge-xs ml-1">
                              {LINEAGE_TYPES[c.lineageType]?.label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Close button */}
          <div className="mt-6 flex justify-end">
            <button className="btn btn-ghost btn-sm" onClick={onClose}>
              Yopish
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
