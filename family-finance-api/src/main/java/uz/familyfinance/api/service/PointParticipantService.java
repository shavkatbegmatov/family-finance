package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.dto.request.PointParticipantLinkRequest;
import uz.familyfinance.api.dto.request.PointParticipantRequest;
import uz.familyfinance.api.dto.request.PointParticipantUnlinkRequest;
import uz.familyfinance.api.dto.response.PointParticipantResponse;
import uz.familyfinance.api.entity.*;
import uz.familyfinance.api.exception.ResourceNotFoundException;
import uz.familyfinance.api.repository.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PointParticipantService {

    private final PointParticipantRepository participantRepository;
    private final PointBalanceRepository balanceRepository;
    private final PointSavingsAccountRepository savingsRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final PointConfigService configService;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public List<PointParticipantResponse> getAll() {
        Long scopeId = configService.getActiveHouseholdScopeId();
        return participantRepository.findByScopeIdAndIsActiveTrue(scopeId).stream()
                .map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<PointParticipantResponse> getAllPaged(Pageable pageable) {
        Long scopeId = configService.getActiveHouseholdScopeId();
        return participantRepository.findByScopeId(scopeId, pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public PointParticipantResponse getById(Long id) {
        return toResponse(findById(id));
    }

    @Transactional
    public PointParticipantResponse create(PointParticipantRequest request) {
        var userDetails = configService.getCurrentUserDetails();
        FamilyGroup group = configService.getCurrentFamilyGroup();
        // Phase 2.G: aktiv scope MAJBURIY — participant/balance/savings uchun NOT NULL.
        // Scope yo'q bo'lsa getActiveScope() aniq xato tashlaydi.
        var activeScope = configService.getScopeContext().getActiveScope();

        if (request.getFamilyMemberId() != null) {
            if (participantRepository.existsByScopeIdAndFamilyMemberId(group.getId(), request.getFamilyMemberId())) {
                throw new IllegalArgumentException("Bu oila a'zosi allaqachon ishtirokchi sifatida qo'shilgan");
            }
        }

        PointParticipant participant = PointParticipant.builder()
                .familyGroup(group)
                .scope(activeScope)
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .nickname(request.getNickname())
                .birthDate(request.getBirthDate())
                .avatar(request.getAvatar())
                .addedBy(userDetails.getUser())
                .build();

        if (request.getFamilyMemberId() != null) {
            FamilyMember member = findAndValidateFamilyMember(request.getFamilyMemberId(), group.getId());
            participant.setFamilyMember(member);
        }

        participant = participantRepository.save(participant);

        // Avtomatik PointBalance yaratish
        PointBalance balance = PointBalance.builder()
                .familyGroup(group)
                .scope(activeScope)
                .participant(participant)
                .build();
        balanceRepository.save(balance);

        // Avtomatik PointSavingsAccount yaratish
        PointSavingsAccount savings = PointSavingsAccount.builder()
                .familyGroup(group)
                .scope(activeScope)
                .participant(participant)
                .build();
        savingsRepository.save(savings);

        log.info("Yangi ishtirokchi qo'shildi: {} (ID: {})", participant.getDisplayName(), participant.getId());
        return toResponse(participant);
    }

    @Transactional
    public PointParticipantResponse update(Long id, PointParticipantRequest request) {
        PointParticipant participant = findById(id);
        participant.setFirstName(request.getFirstName());
        participant.setLastName(request.getLastName());
        participant.setNickname(request.getNickname());
        participant.setBirthDate(request.getBirthDate());
        participant.setAvatar(request.getAvatar());
        return toResponse(participantRepository.save(participant));
    }

    @Transactional
    public void deactivate(Long id) {
        PointParticipant participant = findById(id);
        participant.setIsActive(false);
        participantRepository.save(participant);
    }

    @Transactional
    public PointParticipantResponse linkMember(Long participantId, PointParticipantLinkRequest request) {
        Long scopeId = configService.getActiveHouseholdScopeId();
        Long currentUserId = getCurrentUserId();

        PointParticipant participant = findById(participantId);
        validateParticipantAccess(participant, scopeId);
        validateParticipantIsActive(participant);

        FamilyMember targetMember = findAndValidateFamilyMember(request.getFamilyMemberId(), scopeId);
        FamilyMember previousMember = participant.getFamilyMember();

        if (previousMember != null && Objects.equals(previousMember.getId(), targetMember.getId())) {
            return toResponse(participant);
        }

        PointParticipant currentOwner = participantRepository
                .findByScopeIdAndFamilyMemberId(scopeId, targetMember.getId())
                .orElse(null);
        boolean targetBoundToAnother = currentOwner != null && !Objects.equals(currentOwner.getId(), participant.getId());
        boolean participantHadDifferentMember = previousMember != null
                && !Objects.equals(previousMember.getId(), targetMember.getId());
        boolean isTransfer = targetBoundToAnother || participantHadDifferentMember;

        if (isTransfer) {
            validateReason(request.getReason(), "Qayta bog'lash uchun sabab kamida 10 belgi bo'lishi kerak");
        }

        boolean forceTransfer = request.getForceTransfer() == null || request.getForceTransfer();
        if (targetBoundToAnother && !forceTransfer) {
            throw new IllegalArgumentException("Tanlangan oila a'zosi boshqa ishtirokchiga bog'langan");
        }

        if (targetBoundToAnother) {
            currentOwner.setFamilyMember(null);
            participantRepository.save(currentOwner);
        }

        Map<String, Object> oldValue = new HashMap<>();
        oldValue.put("participantId", participant.getId());
        oldValue.put("participantName", participant.getDisplayName());
        oldValue.put("fromMemberId", previousMember != null ? previousMember.getId() : null);
        oldValue.put("fromMemberName", previousMember != null ? previousMember.getDisplayName() : null);

        participant.setFamilyMember(targetMember);
        participant = participantRepository.save(participant);

        Map<String, Object> newValue = new HashMap<>();
        newValue.put("participantId", participant.getId());
        newValue.put("participantName", participant.getDisplayName());
        newValue.put("toMemberId", targetMember.getId());
        newValue.put("toMemberName", targetMember.getDisplayName());
        newValue.put("reason", request.getReason() != null ? request.getReason().trim() : null);
        newValue.put("source", "POINTS_PARTICIPANTS_PAGE");
        if (targetBoundToAnother && currentOwner != null) {
            newValue.put("targetMemberPreviousParticipantId", currentOwner.getId());
            newValue.put("targetMemberPreviousParticipantName", currentOwner.getDisplayName());
        }

        auditLogService.log(
                "PointParticipantLink",
                participant.getId(),
                isTransfer ? "TRANSFER" : "LINK",
                oldValue,
                newValue,
                currentUserId
        );

        return toResponse(participant);
    }

    @Transactional
    public PointParticipantResponse unlinkMember(Long participantId, PointParticipantUnlinkRequest request) {
        Long scopeId = configService.getActiveHouseholdScopeId();
        Long currentUserId = getCurrentUserId();

        PointParticipant participant = findById(participantId);
        validateParticipantAccess(participant, scopeId);

        FamilyMember linkedMember = participant.getFamilyMember();
        if (linkedMember == null) {
            throw new IllegalArgumentException("Ishtirokchi hali oila a'zosiga bog'lanmagan");
        }

        validateReason(request.getReason(), "Bog'lanishni uzish uchun sabab kamida 10 belgi bo'lishi kerak");

        Map<String, Object> oldValue = new HashMap<>();
        oldValue.put("participantId", participant.getId());
        oldValue.put("participantName", participant.getDisplayName());
        oldValue.put("fromMemberId", linkedMember.getId());
        oldValue.put("fromMemberName", linkedMember.getDisplayName());
        oldValue.put("reason", request.getReason().trim());
        oldValue.put("source", "POINTS_PARTICIPANTS_PAGE");

        participant.setFamilyMember(null);
        participant = participantRepository.save(participant);

        Map<String, Object> newValue = new HashMap<>();
        newValue.put("participantId", participant.getId());
        newValue.put("participantName", participant.getDisplayName());
        newValue.put("toMemberId", null);
        newValue.put("toMemberName", null);
        newValue.put("reason", request.getReason().trim());
        newValue.put("source", "POINTS_PARTICIPANTS_PAGE");

        auditLogService.log(
                "PointParticipantLink",
                participant.getId(),
                "UNLINK",
                oldValue,
                newValue,
                currentUserId
        );

        return toResponse(participant);
    }

    public PointParticipant findById(Long id) {
        return participantRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ishtirokchi topilmadi: " + id));
    }

    public PointParticipantResponse toResponse(PointParticipant p) {
        PointParticipantResponse r = new PointParticipantResponse();
        r.setId(p.getId());
        r.setFamilyGroupId(p.getFamilyGroup().getId());
        r.setFirstName(p.getFirstName());
        r.setLastName(p.getLastName());
        r.setNickname(p.getNickname());
        r.setDisplayName(p.getDisplayName());
        r.setBirthDate(p.getBirthDate());
        r.setAvatar(p.getAvatar());
        r.setIsActive(p.getIsActive());
        r.setCreatedAt(p.getCreatedAt());
        if (p.getFamilyMember() != null) {
            r.setFamilyMemberId(p.getFamilyMember().getId());
            r.setFamilyMemberName(p.getFamilyMember().getFullName());
            // Bog'langan oila a'zosining User akkaunti bormi — badge'lar uchun.
            if (p.getFamilyMember().getUser() != null) {
                r.setFamilyMemberUserId(p.getFamilyMember().getUser().getId());
                r.setFamilyMemberUsername(p.getFamilyMember().getUser().getUsername());
            }
        }
        return r;
    }

    private void validateParticipantAccess(PointParticipant participant, Long scopeId) {
        // ADR-002 P1b: ishtirokchi konteksti — hamyon scope'i (participant.scope V39'dan NOT NULL)
        if (!Objects.equals(participant.getScope().getId(), scopeId)) {
            throw new ResourceNotFoundException("Ishtirokchi topilmadi: " + participant.getId());
        }
    }

    private void validateParticipantIsActive(PointParticipant participant) {
        if (!Boolean.TRUE.equals(participant.getIsActive())) {
            throw new IllegalArgumentException("Nofaol ishtirokchini bog'lab bo'lmaydi");
        }
    }

    private FamilyMember findAndValidateFamilyMember(Long familyMemberId, Long scopeId) {
        FamilyMember member = familyMemberRepository.findById(familyMemberId)
                .orElseThrow(() -> new ResourceNotFoundException("Oila a'zosi topilmadi"));

        // A'zolik tekshiruvi GENEALOGIK tenant bo'yicha (FamilyMember'da scope yo'q — ADR-001 F4):
        // a'zo joriy user oilasidan bo'lishi shart; hamyon konteksti (scopeId) bunga aralashmaydi.
        FamilyGroup currentTenant = configService.getCurrentFamilyGroup();
        if (member.getFamilyGroup() == null
                || !Objects.equals(member.getFamilyGroup().getId(), currentTenant.getId())) {
            throw new ResourceNotFoundException("Oila a'zosi topilmadi");
        }

        if (!Boolean.TRUE.equals(member.getIsActive())) {
            throw new IllegalArgumentException("Nofaol oila a'zosini bog'lab bo'lmaydi");
        }
        return member;
    }

    private void validateReason(String reason, String message) {
        if (reason == null || reason.trim().length() < 10) {
            throw new IllegalArgumentException(message);
        }
    }

    private Long getCurrentUserId() {
        return configService.getCurrentUserDetails().getUser().getId();
    }
}
