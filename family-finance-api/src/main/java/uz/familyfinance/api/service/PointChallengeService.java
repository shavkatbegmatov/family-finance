package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.dto.request.PointChallengeRequest;
import uz.familyfinance.api.dto.response.PointChallengeResponse;
import uz.familyfinance.api.entity.*;
import uz.familyfinance.api.enums.PointChallengeStatus;
import uz.familyfinance.api.enums.PointTaskCategory;
import uz.familyfinance.api.enums.PointTransactionType;
import uz.familyfinance.api.exception.ResourceNotFoundException;
import uz.familyfinance.api.repository.*;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PointChallengeService {

    private final PointChallengeRepository challengeRepository;
    private final PointChallengeParticipantRepository challengeParticipantRepository;
    private final PointParticipantService participantService;
    private final PointTransactionService transactionService;
    private final PointConfigService configService;

    @Transactional(readOnly = true)
    public List<PointChallengeResponse> getAll() {
        Long groupId = configService.getCurrentFamilyGroupId();
        return challengeRepository.findByFamilyGroupId(groupId).stream()
                .map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<PointChallengeResponse> getActive() {
        Long groupId = configService.getCurrentFamilyGroupId();
        return challengeRepository.findByFamilyGroupIdAndStatus(groupId, PointChallengeStatus.ACTIVE).stream()
                .map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional
    public PointChallengeResponse create(PointChallengeRequest request) {
        var userDetails = configService.getCurrentUserDetails();
        PointChallenge challenge = PointChallenge.builder()
                .familyGroup(configService.getCurrentFamilyGroup())
                .title(request.getTitle())
                .description(request.getDescription())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .rewardPoints(request.getRewardPoints())
                .createdBy(userDetails.getUser())
                .build();

        if (request.getTaskCategory() != null) {
            challenge.setTaskCategory(PointTaskCategory.valueOf(request.getTaskCategory()));
        }

        return toResponse(challengeRepository.save(challenge));
    }

    @Transactional
    public PointChallengeResponse join(Long challengeId, Long participantId) {
        PointChallenge challenge = findById(challengeId);
        if (challenge.getStatus() != PointChallengeStatus.ACTIVE) {
            throw new IllegalStateException("Musobaqa faol emas");
        }
        if (challengeParticipantRepository.existsByChallengeIdAndParticipantId(challengeId, participantId)) {
            throw new IllegalArgumentException("Ishtirokchi allaqachon qo'shilgan");
        }

        PointParticipant participant = participantService.findById(participantId);
        PointChallengeParticipant cp = PointChallengeParticipant.builder()
                .challenge(challenge)
                .participant(participant)
                .build();
        challengeParticipantRepository.save(cp);
        return toResponse(challenge);
    }

    @Transactional
    public PointChallengeResponse complete(Long challengeId) {
        PointChallenge challenge = findById(challengeId);
        challenge.setStatus(PointChallengeStatus.COMPLETED);
        challengeRepository.save(challenge);

        // G'olibga mukofot berish
        List<PointChallengeParticipant> participants =
                challengeParticipantRepository.findByChallengeIdOrderByScoreDesc(challengeId);

        for (int i = 0; i < participants.size(); i++) {
            PointChallengeParticipant cp = participants.get(i);
            cp.setRank(i + 1);
            challengeParticipantRepository.save(cp);

            if (i == 0 && cp.getScore() > 0) {
                transactionService.createTransaction(
                        cp.getParticipant(), PointTransactionType.CHALLENGE_REWARD,
                        challenge.getRewardPoints(),
                        "Musobaqa g'olibi: " + challenge.getTitle(),
                        null, null
                );
            }
        }

        return toResponse(challenge);
    }

    @Transactional
    public void cancel(Long challengeId) {
        PointChallenge challenge = findById(challengeId);
        challenge.setStatus(PointChallengeStatus.CANCELLED);
        challengeRepository.save(challenge);
    }

    @Transactional(readOnly = true)
    public PointChallengeResponse getResults(Long challengeId) {
        return toResponse(findById(challengeId));
    }

    private PointChallenge findById(Long id) {
        return challengeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Musobaqa topilmadi: " + id));
    }

    private PointChallengeResponse toResponse(PointChallenge c) {
        PointChallengeResponse r = new PointChallengeResponse();
        r.setId(c.getId());
        r.setTitle(c.getTitle());
        r.setDescription(c.getDescription());
        r.setStartDate(c.getStartDate());
        r.setEndDate(c.getEndDate());
        r.setRewardPoints(c.getRewardPoints());
        r.setStatus(c.getStatus().name());
        if (c.getTaskCategory() != null) r.setTaskCategory(c.getTaskCategory().name());
        r.setCreatedByName(c.getCreatedBy().getFullName());
        r.setCreatedAt(c.getCreatedAt());

        List<PointChallengeParticipant> participants =
                challengeParticipantRepository.findByChallengeIdOrderByScoreDesc(c.getId());
        r.setParticipants(participants.stream().map(cp -> {
            PointChallengeResponse.ChallengeParticipantEntry e = new PointChallengeResponse.ChallengeParticipantEntry();
            e.setParticipantId(cp.getParticipant().getId());
            e.setParticipantName(cp.getParticipant().getDisplayName());
            e.setScore(cp.getScore());
            e.setRank(cp.getRank());
            return e;
        }).collect(Collectors.toList()));

        return r;
    }
}
