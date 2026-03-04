package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.dto.request.PointParticipantRequest;
import uz.familyfinance.api.dto.response.PointParticipantResponse;
import uz.familyfinance.api.entity.*;
import uz.familyfinance.api.exception.ResourceNotFoundException;
import uz.familyfinance.api.repository.*;

import java.util.List;
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

    @Transactional(readOnly = true)
    public List<PointParticipantResponse> getAll() {
        Long groupId = configService.getCurrentFamilyGroupId();
        return participantRepository.findByFamilyGroupIdAndIsActiveTrue(groupId).stream()
                .map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<PointParticipantResponse> getAllPaged(Pageable pageable) {
        Long groupId = configService.getCurrentFamilyGroupId();
        return participantRepository.findByFamilyGroupId(groupId, pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public PointParticipantResponse getById(Long id) {
        return toResponse(findById(id));
    }

    @Transactional
    public PointParticipantResponse create(PointParticipantRequest request) {
        var userDetails = configService.getCurrentUserDetails();
        FamilyGroup group = configService.getCurrentFamilyGroup();

        if (request.getFamilyMemberId() != null) {
            if (participantRepository.existsByFamilyGroupIdAndFamilyMemberId(group.getId(), request.getFamilyMemberId())) {
                throw new IllegalArgumentException("Bu oila a'zosi allaqachon ishtirokchi sifatida qo'shilgan");
            }
        }

        PointParticipant participant = PointParticipant.builder()
                .familyGroup(group)
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .nickname(request.getNickname())
                .birthDate(request.getBirthDate())
                .avatar(request.getAvatar())
                .addedBy(userDetails.getUser())
                .build();

        if (request.getFamilyMemberId() != null) {
            FamilyMember member = familyMemberRepository.findById(request.getFamilyMemberId())
                    .orElseThrow(() -> new ResourceNotFoundException("Oila a'zosi topilmadi"));
            participant.setFamilyMember(member);
        }

        participant = participantRepository.save(participant);

        // Avtomatik PointBalance yaratish
        PointBalance balance = PointBalance.builder()
                .familyGroup(group)
                .participant(participant)
                .build();
        balanceRepository.save(balance);

        // Avtomatik PointSavingsAccount yaratish
        PointSavingsAccount savings = PointSavingsAccount.builder()
                .familyGroup(group)
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
    public PointParticipantResponse linkMember(Long participantId, Long familyMemberId) {
        PointParticipant participant = findById(participantId);
        FamilyMember member = familyMemberRepository.findById(familyMemberId)
                .orElseThrow(() -> new ResourceNotFoundException("Oila a'zosi topilmadi"));
        participant.setFamilyMember(member);
        return toResponse(participantRepository.save(participant));
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
        }
        return r;
    }
}
