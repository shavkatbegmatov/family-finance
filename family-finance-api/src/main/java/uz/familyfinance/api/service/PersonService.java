package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.dto.request.FamilyMemberRequest;
import uz.familyfinance.api.dto.request.PersonCreateRequest;
import uz.familyfinance.api.dto.request.PointParticipantRequest;
import uz.familyfinance.api.dto.response.FamilyMemberResponse;
import uz.familyfinance.api.dto.response.PersonCreateResponse;
import uz.familyfinance.api.dto.response.PointParticipantResponse;
import uz.familyfinance.api.enums.FamilyRole;
import uz.familyfinance.api.enums.PermissionCode;
import uz.familyfinance.api.enums.PersonType;
import uz.familyfinance.api.security.CustomUserDetails;

/**
 * "Yangi shaxs qo'shish" wizard'ining orchestratori.
 *
 * <p>{@link #createPerson(PersonCreateRequest)} bitta atomik tranzaksiya ichida
 * tegishli entity'larni yaratadi (User, FamilyMember, PointParticipant) — bularning
 * qaysi biri yaratilishi {@link PersonType} qiymatiga bog'liq.</p>
 *
 * <p>Logika qayta yozilmaydi — har bir entity yaratish o'z servisiga delegatsiya qilinadi:
 * {@link FamilyMemberService#create} (kerak bo'lsa User'ni ham yaratadi) va
 * {@link PointParticipantService#create}. Bu DRY tamoyiliga rioya qiladi.</p>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PersonService {

    /** Akkaunt yaratilganda default ravishda beriladigan rol kodi. */
    private static final String DEFAULT_ACCOUNT_ROLE = "MEMBER";

    private final FamilyMemberService familyMemberService;
    private final PointParticipantService participantService;
    private final PointConfigService configService;

    @Transactional
    public PersonCreateResponse createPerson(PersonCreateRequest request) {
        PersonType type = request.getPersonType();
        CustomUserDetails currentUser = configService.getCurrentUserDetails();

        validatePermissions(type, currentUser);

        FamilyMemberResponse member = familyMemberService.create(
                buildFamilyMemberRequest(request, type), currentUser);

        PointParticipantResponse participant = null;
        if (type.needsParticipant()) {
            participant = participantService.create(
                    buildParticipantRequest(request, member.getId()));
        }

        log.info("Person created: type={}, familyMemberId={}, userId={}, participantId={}",
                type, member.getId(), member.getUserId(),
                participant != null ? participant.getId() : null);

        return PersonCreateResponse.builder()
                .personType(type)
                .familyMemberId(member.getId())
                .displayName(member.getFullName())
                .userId(member.getUserId())
                .credentials(member.getCredentials())
                .participantId(participant != null ? participant.getId() : null)
                .message(buildSuccessMessage(type))
                .build();
    }

    /**
     * Tur asosida kerakli ruxsatlarni tekshiradi. FAMILY_CREATE har doim majburiy
     * (chunki barcha turlar FamilyMember yaratadi); qolganlari shart bilan.
     */
    private void validatePermissions(PersonType type, CustomUserDetails user) {
        requirePermission(user, PermissionCode.FAMILY_CREATE, "Oila a'zosi yaratish ruxsati yo'q");
        if (type.needsUser()) {
            requirePermission(user, PermissionCode.USERS_CREATE,
                    "Foydalanuvchi akkaunti yaratish ruxsati yo'q");
        }
        if (type.needsParticipant()) {
            requirePermission(user, PermissionCode.POINTS_MANAGE,
                    "Ball ishtirokchisi yaratish ruxsati yo'q");
        }
    }

    private void requirePermission(CustomUserDetails user, PermissionCode permission, String message) {
        if (!user.hasPermission(permission.getCode())) {
            throw new AccessDeniedException(message);
        }
    }

    private FamilyMemberRequest buildFamilyMemberRequest(PersonCreateRequest request, PersonType type) {
        FamilyMemberRequest mr = new FamilyMemberRequest();
        mr.setFirstName(request.getFirstName());
        mr.setLastName(request.getLastName());
        mr.setMiddleName(request.getMiddleName());
        mr.setGender(request.getGender());
        mr.setBirthDate(request.getBirthDate());
        mr.setBirthPlace(request.getBirthPlace());
        mr.setPhone(request.getPhone());
        mr.setRole(resolveFamilyRole(request.getFamilyRole(), type));

        if (type.needsUser()) {
            mr.setCreateAccount(true);
            mr.setAccountUsername(emptyToNull(request.getUsername()));
            mr.setAccountPassword(emptyToNull(request.getPassword()));
            String role = emptyToNull(request.getAccountRole());
            mr.setAccountRole(role != null ? role : DEFAULT_ACCOUNT_ROLE);
        }
        return mr;
    }

    private PointParticipantRequest buildParticipantRequest(PersonCreateRequest request, Long familyMemberId) {
        PointParticipantRequest pr = new PointParticipantRequest();
        pr.setFirstName(request.getFirstName());
        pr.setLastName(emptyToNull(request.getLastName()));
        pr.setNickname(emptyToNull(request.getNickname()));
        pr.setBirthDate(request.getBirthDate());
        pr.setFamilyMemberId(familyMemberId);
        return pr;
    }

    private FamilyRole resolveFamilyRole(FamilyRole explicit, PersonType type) {
        if (explicit != null) {
            return explicit;
        }
        return type == PersonType.CHILD ? FamilyRole.CHILD : FamilyRole.OTHER;
    }

    private String emptyToNull(String value) {
        return (value == null || value.isBlank()) ? null : value.trim();
    }

    private String buildSuccessMessage(PersonType type) {
        return switch (type) {
            case CHILD -> "Bola muvaffaqiyatli qo'shildi. Endi ball to'plashi mumkin.";
            case ADULT_ACTIVE -> "Foydalanuvchi to'liq akkaunt va ball ishtirokchisi sifatida qo'shildi.";
            case PASSIVE_MEMBER -> "Oila a'zosi qo'shildi.";
            case ADMIN_ONLY -> "Foydalanuvchi akkaunti yaratildi.";
        };
    }
}
