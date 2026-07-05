package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.dto.response.EnrollmentResponse;
import uz.familyfinance.api.dto.response.ScopeResponse;
import uz.familyfinance.api.entity.*;
import uz.familyfinance.api.enums.EnrollmentStatus;
import uz.familyfinance.api.enums.MembershipStatus;
import uz.familyfinance.api.enums.ScopeRole;
import uz.familyfinance.api.enums.ScopeType;
import uz.familyfinance.api.exception.BadRequestException;
import uz.familyfinance.api.exception.ResourceNotFoundException;
import uz.familyfinance.api.repository.*;
import uz.familyfinance.api.util.InviteCodeGenerator;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

/**
 * ADR-002 P4: Maktablar — SCHOOL/CLASS scope'lari, ariza→tasdiq oqimi, sinfga yozish.
 *
 * <p>Qoidalar: SCHOOL ariza bilan yaratiladi (isActive=false) va SUPER_ADMIN tasdiqlaguncha
 * ko'rinmaydi; CLASS faqat maktab egasi/admini tomonidan; bola Enrollment orqali yoziladi —
 * nickname MAJBURIY (K3), yozgan ota-ona = consent. Yozilganda sinf HAMYONI
 * (PointParticipant scope=CLASS) avtomatik ochiladi — u pulga konvertatsiya qilinmaydi
 * (P1c guard), ota-onaga sinfda VIEWER a'zolik beriladi (reyting ko'rinishi uchun).</p>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SchoolService {

    private final ScopeRepository scopeRepository;
    private final ScopeMembershipRepository membershipRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final PointParticipantRepository participantRepository;
    private final PointBalanceRepository balanceRepository;
    private final PointSavingsAccountRepository savingsRepository;
    private final ScopeContextService scopeContext;
    private final InviteCodeGenerator inviteCodeGenerator;

    // ====================================================================
    // Maktab: ariza va tasdiq
    // ====================================================================

    /** Maktab ochish arizasi — isActive=false, SUPER_ADMIN tasdiqlaguncha ko'rinmaydi. */
    @Transactional
    public ScopeResponse applyForSchool(String name, String description) {
        User user = scopeContext.getCurrentUser();
        Scope school = Scope.builder()
                .type(ScopeType.SCHOOL)
                .name(name.trim())
                .ownerUser(user)
                .uniqueCode(inviteCodeGenerator.generateForType(ScopeType.SCHOOL))
                .metadata(description != null ? java.util.Map.of("description", description) : null)
                .isActive(false)
                .build();
        school = scopeRepository.save(school);

        membershipRepository.save(ScopeMembership.builder()
                .scope(school).user(user)
                .role(ScopeRole.OWNER).status(MembershipStatus.ACTIVE)
                .joinedAt(LocalDateTime.now())
                .build());

        log.info("Maktab arizasi: '{}' (id={}, arizachi={})", name, school.getId(), user.getUsername());
        return ScopeResponse.from(school);
    }

    /** SUPER_ADMIN: tasdiq kutayotgan maktablar. */
    @Transactional(readOnly = true)
    public List<ScopeResponse> getPendingSchools() {
        return scopeRepository.findByTypeAndIsActiveFalse(ScopeType.SCHOOL).stream()
                .map(ScopeResponse::from).toList();
    }

    /** SUPER_ADMIN tasdiqlaydi — maktab faollashadi (ko'rinadigan bo'ladi). */
    @Transactional
    public ScopeResponse approveSchool(Long schoolId) {
        Scope school = findSchool(schoolId);
        school.setIsActive(true);
        scopeRepository.save(school);
        log.info("Maktab tasdiqlandi: {} (id={})", school.getName(), schoolId);
        return ScopeResponse.from(school);
    }

    // ====================================================================
    // Sinflar
    // ====================================================================

    /** Sinf yaratish — faqat maktab egasi/admini, faqat tasdiqlangan maktabda. */
    @Transactional
    public ScopeResponse createClass(Long schoolId, String name) {
        Scope school = findSchool(schoolId);
        if (!Boolean.TRUE.equals(school.getIsActive())) {
            throw new BadRequestException("Maktab hali tasdiqlanmagan — sinf ochib bo'lmaydi");
        }
        if (!scopeContext.canManageScope(schoolId)) {
            throw new AccessDeniedException("Sinf ochish uchun maktabda OWNER/ADMIN bo'lishingiz kerak");
        }

        Scope clazz = Scope.builder()
                .type(ScopeType.CLASS)
                .name(name.trim())
                .parentScope(school)
                .ownerUser(school.getOwnerUser())
                .uniqueCode(inviteCodeGenerator.generateForType(ScopeType.CLASS))
                .isActive(true)
                .build();
        clazz = scopeRepository.save(clazz);

        // Sinfni ochgan (maktab egasi/admini) sinfda ham ADMIN — o'qituvchi roli
        membershipRepository.save(ScopeMembership.builder()
                .scope(clazz).user(scopeContext.getCurrentUser())
                .role(ScopeRole.ADMIN).status(MembershipStatus.ACTIVE)
                .joinedAt(LocalDateTime.now())
                .build());

        log.info("Sinf yaratildi: '{}' (id={}, maktab={})", name, clazz.getId(), schoolId);
        return ScopeResponse.from(clazz);
    }

    // ====================================================================
    // Yozish (Enrollment) — bola + sinf hamyoni
    // ====================================================================

    /**
     * Ota-ona farzandini sinfga yozadi: Enrollment (nickname MAJBURIY — K3) + sinf hamyoni
     * (PointParticipant scope=CLASS) + ota-onaga sinfda VIEWER a'zolik.
     */
    @Transactional
    public EnrollmentResponse enroll(Long classId, Long familyMemberId, String nickname) {
        if (nickname == null || nickname.isBlank()) {
            throw new BadRequestException(
                    "Taxallus majburiy — sinf ichida farzandingiz faqat taxallus bilan ko'rinadi");
        }
        Scope clazz = findClass(classId);

        User parent = scopeContext.getCurrentUser();
        FamilyMember child = familyMemberRepository.findById(familyMemberId)
                .orElseThrow(() -> new ResourceNotFoundException("Oila a'zosi topilmadi"));

        // Genealogik tekshiruv: faqat O'Z oilasidagi (tenant) farzandini yozadi
        FamilyGroup tenant = scopeContext.getActiveFamilyGroupOptional().orElse(null);
        if (tenant == null || child.getFamilyGroup() == null
                || !Objects.equals(child.getFamilyGroup().getId(), tenant.getId())) {
            throw new AccessDeniedException("Faqat o'z oilangizdagi farzandni yozishingiz mumkin");
        }

        enrollmentRepository.findByClassScopeIdAndFamilyMemberId(classId, familyMemberId)
                .ifPresent(e -> {
                    if (e.getStatus() == EnrollmentStatus.ENROLLED) {
                        throw new BadRequestException("Farzand allaqachon shu sinfga yozilgan");
                    }
                });

        Enrollment enrollment = enrollmentRepository
                .findByClassScopeIdAndFamilyMemberId(classId, familyMemberId)
                .map(e -> { // qayta yozilish (LEFT → ENROLLED)
                    e.setStatus(EnrollmentStatus.ENROLLED);
                    e.setNickname(nickname.trim());
                    e.setConsentBy(parent);
                    e.setJoinedAt(LocalDateTime.now());
                    e.setLeftAt(null);
                    return e;
                })
                .orElseGet(() -> Enrollment.builder()
                        .classScope(clazz)
                        .familyMember(child)
                        .nickname(nickname.trim())
                        .consentBy(parent)
                        .build());
        enrollment = enrollmentRepository.save(enrollment);

        // Sinf hamyoni — (shaxs, CLASS-kontekst); mavjud bo'lsa qayta faollashtiriladi
        PointParticipant participant = participantRepository
                .findByScopeIdAndFamilyMemberId(classId, familyMemberId)
                .orElse(null);
        if (participant == null) {
            participant = participantRepository.save(PointParticipant.builder()
                    .scope(clazz)
                    .familyMember(child)
                    .firstName(child.getFirstName())
                    .lastName(child.getLastName())
                    .nickname(nickname.trim())
                    .avatar(child.getAvatar())
                    .addedBy(parent)
                    .build());
            balanceRepository.save(PointBalance.builder()
                    .scope(clazz).participant(participant).build());
            savingsRepository.save(PointSavingsAccount.builder()
                    .scope(clazz).participant(participant).build());
        } else {
            participant.setIsActive(true);
            participant.setNickname(nickname.trim());
            participantRepository.save(participant);
        }

        // Ota-onaga sinfda VIEWER — reyting/holatni ko'rish uchun (mavjud visibility infra)
        membershipRepository.findByScopeIdAndUserId(classId, parent.getId())
                .ifPresentOrElse(m -> {
                    if (m.getStatus() != MembershipStatus.ACTIVE) {
                        m.setStatus(MembershipStatus.ACTIVE);
                        membershipRepository.save(m);
                    }
                }, () -> membershipRepository.save(ScopeMembership.builder()
                        .scope(clazz).user(parent)
                        .role(ScopeRole.VIEWER).status(MembershipStatus.ACTIVE)
                        .joinedAt(LocalDateTime.now())
                        .build()));

        log.info("Farzand sinfga yozildi: member={}, class={}, nickname='{}'",
                familyMemberId, classId, nickname);
        return toResponse(enrollment);
    }

    /** Sinfdan chiqarish — yozgan ota-ona yoki sinf/maktab admini. */
    @Transactional
    public void unenroll(Long classId, Long familyMemberId) {
        Enrollment enrollment = enrollmentRepository
                .findByClassScopeIdAndFamilyMemberId(classId, familyMemberId)
                .orElseThrow(() -> new ResourceNotFoundException("Yozilish topilmadi"));

        Long userId = scopeContext.getCurrentUserId();
        boolean isConsentParent = enrollment.getConsentBy() != null
                && Objects.equals(enrollment.getConsentBy().getId(), userId);
        if (!isConsentParent && !scopeContext.canManageScope(classId)) {
            throw new AccessDeniedException("Chiqarish uchun yozgan ota-ona yoki sinf admini bo'lishingiz kerak");
        }

        enrollment.setStatus(EnrollmentStatus.LEFT);
        enrollment.setLeftAt(LocalDateTime.now());
        enrollmentRepository.save(enrollment);

        // Sinf hamyonini nofaol qilamiz (tarix saqlanadi)
        participantRepository.findByScopeIdAndFamilyMemberId(classId, familyMemberId)
                .ifPresent(p -> { p.setIsActive(false); participantRepository.save(p); });

        log.info("Farzand sinfdan chiqarildi: member={}, class={}", familyMemberId, classId);
    }

    /** Sinf ro'yxati — o'qituvchi/ota-ona (VIEWER) uchun; nickname-first (K3). */
    @Transactional(readOnly = true)
    public List<EnrollmentResponse> getClassEnrollments(Long classId) {
        if (!scopeContext.canViewScope(classId)) {
            throw new AccessDeniedException("Bu sinfni ko'rish huquqingiz yo'q");
        }
        boolean teacher = scopeContext.canManageScope(classId);
        return enrollmentRepository.findByClassScopeIdAndStatus(classId, EnrollmentStatus.ENROLLED)
                .stream().map(e -> toResponse(e, teacher)).toList();
    }

    /** Mening farzandlarim yozilgan sinflar (ota-ona ko'rinishi). */
    @Transactional(readOnly = true)
    public List<EnrollmentResponse> getMyChildrenEnrollments() {
        Long userId = scopeContext.getCurrentUserId();
        return enrollmentRepository.findActiveByConsentUser(userId)
                .stream().map(e -> toResponse(e, true)).toList();
    }

    // ====================================================================
    // Helpers
    // ====================================================================

    private Scope findSchool(Long id) {
        Scope s = scopeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Maktab topilmadi: " + id));
        if (s.getType() != ScopeType.SCHOOL) {
            throw new BadRequestException("Bu scope maktab emas");
        }
        return s;
    }

    private Scope findClass(Long id) {
        Scope s = scopeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sinf topilmadi: " + id));
        if (s.getType() != ScopeType.CLASS || !Boolean.TRUE.equals(s.getIsActive())) {
            throw new BadRequestException("Bu scope faol sinf emas");
        }
        return s;
    }

    private EnrollmentResponse toResponse(Enrollment e) {
        return toResponse(e, false);
    }

    /** K3: haqiqiy ism faqat o'qituvchi/adminlarga; boshqalarga faqat nickname. */
    private EnrollmentResponse toResponse(Enrollment e, boolean includeRealName) {
        EnrollmentResponse r = new EnrollmentResponse();
        r.setId(e.getId());
        r.setClassScopeId(e.getClassScope().getId());
        r.setClassName(e.getClassScope().getName());
        r.setFamilyMemberId(e.getFamilyMember().getId());
        r.setNickname(e.getNickname());
        r.setRealName(includeRealName ? e.getFamilyMember().getFullName() : null);
        r.setStatus(e.getStatus().name());
        r.setJoinedAt(e.getJoinedAt());
        return r;
    }
}
