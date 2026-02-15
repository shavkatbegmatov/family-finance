import {
  X,
  Calendar,
  MapPin,
  Phone,
  Users,
  Heart,
  Crown,
  UserCircle,
} from 'lucide-react';
import { SidePanel } from '../../common/SidePanel';
import {
  useActivePersonsQuery,
  useFamilyUnitsByPersonQuery,
  useRelationshipQuery,
} from '../../../hooks/useFamilyTreeQueries';
import { useFamilyTreeStore } from '../../../store/familyTreeStore';
import {
  formatDate,
  GENDERS,
  MARRIAGE_TYPES,
  LINEAGE_TYPES,
  RELATIONSHIP_TYPES,
} from '../../../config/constants';

interface PersonDetailPanelProps {
  isOpen: boolean;
  personId: number;
  onClose: () => void;
}

// Qarindoshlik kategoriyasiga qarab badge rangi
const categoryColors: Record<string, string> = {
  parents: 'badge-primary',
  spouse: 'badge-secondary',
  children: 'badge-accent',
  siblings: 'badge-info',
  grandparents: 'badge-primary badge-outline',
  grandchildren: 'badge-accent badge-outline',
  'in-laws': 'badge-warning',
  extended: 'badge-ghost',
  other: 'badge-ghost',
};

// Gender ga qarab gradient
function getGenderGradient(gender?: string) {
  if (gender === 'MALE') return 'from-blue-400 to-blue-600';
  if (gender === 'FEMALE') return 'from-pink-400 to-pink-600';
  return 'from-amber-400 to-amber-600';
}

function getGenderBorder(gender?: string) {
  if (gender === 'MALE') return 'ring-blue-400/30';
  if (gender === 'FEMALE') return 'ring-pink-400/30';
  return 'ring-amber-400/30';
}

export function PersonDetailPanel({
  isOpen,
  personId,
  onClose,
}: PersonDetailPanelProps) {
  const { data: activePersons = [] } = useActivePersonsQuery();
  const { data: familyUnits = [], isLoading: loadingUnits } =
    useFamilyUnitsByPersonQuery(personId);
  const { viewerPersonId, openModal } = useFamilyTreeStore();
  const { data: relationship } = useRelationshipQuery(
    viewerPersonId ?? 0,
    personId
  );

  const person = activePersons.find((p) => p.id === personId);

  if (!isOpen) return null;

  const age =
    person?.birthDate
      ? Math.floor(
          (Date.now() - new Date(person.birthDate).getTime()) /
            (365.25 * 24 * 60 * 60 * 1000)
        )
      : null;

  // Ota-onalar — person CHILD bo'lgan family unitlar
  const parentUnits = familyUnits.filter((fu) =>
    fu.children.some((c) => c.personId === personId)
  );
  // Nikohlar — person PARTNER bo'lgan family unitlar
  const marriageUnits = familyUnits.filter((fu) =>
    fu.partners.some((p) => p.personId === personId)
  );

  // Ota-onalar ro'yxati
  const parents = parentUnits.flatMap((fu) => fu.partners);

  // Qarindoshlik label va kategoriyasi
  const relLabel = relationship?.relationshipLabel;
  const relType = relLabel ? RELATIONSHIP_TYPES[relLabel] : null;

  const handlePersonClick = (clickedPersonId: number) => {
    openModal({ type: 'personDetail', personId: clickedPersonId });
  };

  return (
    <SidePanel isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col h-full">
        {/* ===== Header ===== */}
        <div
          className={`relative bg-gradient-to-br ${getGenderGradient(person?.gender)} p-6 pb-16`}
        >
          <button
            className="absolute top-4 right-4 btn btn-circle btn-sm btn-ghost text-white/80 hover:text-white hover:bg-white/20"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>

          {person?.deathDate && (
            <span className="absolute top-4 left-4 badge badge-sm bg-black/30 border-0 text-white gap-1">
              Vafot etgan
            </span>
          )}
        </div>

        {/* Avatar (header bilan overlap) */}
        <div className="relative -mt-12 px-6">
          <div
            className={`h-24 w-24 rounded-2xl bg-gradient-to-br ${getGenderGradient(person?.gender)} ring-4 ${getGenderBorder(person?.gender)} ring-offset-2 ring-offset-base-100 flex items-center justify-center text-white text-3xl font-bold shadow-lg`}
          >
            {person?.avatar ? (
              <img
                src={person.avatar}
                alt={person.fullName}
                className="h-24 w-24 rounded-2xl object-cover"
              />
            ) : (
              person?.fullName.charAt(0).toUpperCase()
            )}
          </div>
        </div>

        {/* ===== Ism va qarindoshlik ===== */}
        <div className="px-6 mt-3">
          <h2 className="text-2xl font-bold">{person?.fullName}</h2>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {person?.gender && (
              <span className="badge badge-sm badge-outline">
                {GENDERS[person.gender]?.label}
              </span>
            )}
            {relType && (
              <span
                className={`badge badge-sm ${categoryColors[relType.category] || 'badge-ghost'}`}
              >
                {relType.label}
              </span>
            )}
          </div>
        </div>

        {/* ===== Ma'lumotlar ===== */}
        <div className="px-6 mt-5 space-y-2.5">
          {person?.birthDate && (
            <div className="flex items-center gap-3 text-sm">
              <div className="h-8 w-8 rounded-lg bg-base-200 flex items-center justify-center shrink-0">
                <Calendar className="h-4 w-4 text-base-content/50" />
              </div>
              <div>
                <span className="text-base-content/50 text-xs">
                  Tug'ilgan sana
                </span>
                <p className="font-medium">
                  {formatDate(person.birthDate)}
                  {age !== null && (
                    <span className="text-base-content/40 ml-1">
                      ({age} yosh)
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}
          {person?.deathDate && (
            <div className="flex items-center gap-3 text-sm">
              <div className="h-8 w-8 rounded-lg bg-base-200 flex items-center justify-center shrink-0">
                <Calendar className="h-4 w-4 text-base-content/50" />
              </div>
              <div>
                <span className="text-base-content/50 text-xs">
                  Vafot sanasi
                </span>
                <p className="font-medium">{formatDate(person.deathDate)}</p>
              </div>
            </div>
          )}
          {person?.birthPlace && (
            <div className="flex items-center gap-3 text-sm">
              <div className="h-8 w-8 rounded-lg bg-base-200 flex items-center justify-center shrink-0">
                <MapPin className="h-4 w-4 text-base-content/50" />
              </div>
              <div>
                <span className="text-base-content/50 text-xs">
                  Tug'ilgan joy
                </span>
                <p className="font-medium">{person.birthPlace}</p>
              </div>
            </div>
          )}
          {person?.phone && (
            <div className="flex items-center gap-3 text-sm">
              <div className="h-8 w-8 rounded-lg bg-base-200 flex items-center justify-center shrink-0">
                <Phone className="h-4 w-4 text-base-content/50" />
              </div>
              <div>
                <span className="text-base-content/50 text-xs">Telefon</span>
                <p className="font-medium">
                  <a
                    href={`tel:${person.phone}`}
                    className="link link-hover link-primary"
                  >
                    {person.phone}
                  </a>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ===== Ota-onalar ===== */}
        {loadingUnits ? (
          <div className="flex justify-center py-6">
            <span className="loading loading-spinner loading-sm" />
          </div>
        ) : (
          <>
            {parents.length > 0 && (
              <div className="px-6 mt-6">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-base-content/40 mb-3 flex items-center gap-1.5">
                  <Crown className="h-3.5 w-3.5" />
                  Ota-ona
                </h4>
                <div className="space-y-2">
                  {parents.map((parent) => (
                    <button
                      key={parent.id}
                      className="flex items-center gap-3 w-full p-3 rounded-xl bg-base-200/50 hover:bg-base-200 transition-colors text-left"
                      onClick={() => handlePersonClick(parent.personId)}
                    >
                      <div
                        className={`h-10 w-10 rounded-full bg-gradient-to-br ${getGenderGradient(parent.gender)} flex items-center justify-center text-white text-sm font-bold shrink-0`}
                      >
                        {parent.avatar ? (
                          <img
                            src={parent.avatar}
                            alt={parent.fullName}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          parent.fullName.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">
                          {parent.fullName}
                        </p>
                        <p className="text-xs text-base-content/40">
                          {parent.gender === 'MALE' ? 'Ota' : 'Ona'}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ===== Nikohlar ===== */}
            {marriageUnits.length > 0 && (
              <div className="px-6 mt-6">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-base-content/40 mb-3 flex items-center gap-1.5">
                  <Heart className="h-3.5 w-3.5" />
                  Nikohlar
                </h4>
                <div className="space-y-3">
                  {marriageUnits.map((fu) => {
                    const otherPartner = fu.partners.find(
                      (p) => p.personId !== personId
                    );
                    return (
                      <div
                        key={fu.id}
                        className="rounded-xl bg-base-200/50 overflow-hidden"
                      >
                        {/* Juft */}
                        <div className="p-3 flex items-center justify-between">
                          {otherPartner ? (
                            <button
                              className="flex items-center gap-3 hover:opacity-80 transition-opacity text-left"
                              onClick={() =>
                                handlePersonClick(otherPartner.personId)
                              }
                            >
                              <div
                                className={`h-9 w-9 rounded-full bg-gradient-to-br ${getGenderGradient(otherPartner.gender)} flex items-center justify-center text-white text-xs font-bold shrink-0`}
                              >
                                {otherPartner.avatar ? (
                                  <img
                                    src={otherPartner.avatar}
                                    alt={otherPartner.fullName}
                                    className="h-9 w-9 rounded-full object-cover"
                                  />
                                ) : (
                                  otherPartner.fullName.charAt(0).toUpperCase()
                                )}
                              </div>
                              <span className="font-medium text-sm">
                                {otherPartner.fullName}
                              </span>
                            </button>
                          ) : (
                            <span className="text-sm text-base-content/40">
                              —
                            </span>
                          )}
                          <span className="badge badge-xs badge-outline">
                            {MARRIAGE_TYPES[fu.marriageType]?.label}
                          </span>
                        </div>

                        {/* Farzandlar */}
                        {fu.children.length > 0 && (
                          <div className="border-t border-base-300/50 px-3 py-2.5">
                            <div className="flex items-center gap-1 text-xs text-base-content/40 mb-2">
                              <Users className="h-3 w-3" />
                              <span>Farzandlar</span>
                            </div>
                            <div className="space-y-1.5">
                              {fu.children.map((child) => (
                                <button
                                  key={child.id}
                                  className="flex items-center justify-between w-full text-left hover:bg-base-300/30 rounded-lg px-2 py-1 transition-colors"
                                  onClick={() =>
                                    handlePersonClick(child.personId)
                                  }
                                >
                                  <div className="flex items-center gap-2">
                                    <UserCircle className="h-4 w-4 text-base-content/30" />
                                    <span className="text-sm">
                                      {child.fullName}
                                    </span>
                                  </div>
                                  <span className="badge badge-xs badge-ghost">
                                    {LINEAGE_TYPES[child.lineageType]?.label}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Ota-ona ham nikoh ham yo'q */}
            {parents.length === 0 && marriageUnits.length === 0 && (
              <div className="px-6 mt-6 text-center text-sm text-base-content/30 py-4">
                Oilaviy ma'lumotlar topilmadi
              </div>
            )}
          </>
        )}

        {/* Bottom padding */}
        <div className="pb-6" />
      </div>
    </SidePanel>
  );
}
