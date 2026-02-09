package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.dto.request.AddFamilyMemberWithRelationRequest;
import uz.familyfinance.api.dto.request.AddRelationshipRequest;
import uz.familyfinance.api.dto.response.*;
import uz.familyfinance.api.entity.FamilyMember;
import uz.familyfinance.api.entity.FamilyRelationship;
import uz.familyfinance.api.entity.User;
import uz.familyfinance.api.enums.Gender;
import uz.familyfinance.api.enums.RelationshipType;
import uz.familyfinance.api.exception.ResourceNotFoundException;
import uz.familyfinance.api.repository.FamilyMemberRepository;
import uz.familyfinance.api.repository.FamilyRelationshipRepository;
import uz.familyfinance.api.repository.UserRepository;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class FamilyTreeService {

    private final FamilyMemberRepository familyMemberRepository;
    private final FamilyRelationshipRepository relationshipRepository;
    private final RelationshipInverseService inverseService;
    private final UserRepository userRepository;
    private final UserService userService;

    @Transactional(readOnly = true)
    public FamilyTreeResponse getTree(Long memberId) {
        Long rootId = memberId != null ? memberId : resolveFamilyMemberId();

        FamilyMember root = familyMemberRepository.findById(rootId)
                .orElseThrow(() -> new ResourceNotFoundException("Oila a'zosi topilmadi: " + rootId));

        List<FamilyRelationship> relationships = relationshipRepository.findByFromMemberId(rootId);

        Set<Long> memberIds = new HashSet<>();
        memberIds.add(rootId);
        relationships.forEach(r -> memberIds.add(r.getToMember().getId()));

        List<FamilyMember> members = familyMemberRepository.findAllById(memberIds);

        FamilyTreeResponse response = new FamilyTreeResponse();
        response.setRootMemberId(rootId);
        response.setMembers(members.stream().map(this::toMemberDto).collect(Collectors.toList()));
        response.setRelationships(relationships.stream().map(this::toRelationshipDto).collect(Collectors.toList()));

        return response;
    }

    @Transactional(readOnly = true)
    public Long resolveFamilyMemberId() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Foydalanuvchi topilmadi"));

        FamilyMember member = familyMemberRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Profilingiz oila a'zosiga bog'lanmagan. Avval oila a'zosi yaratib, foydalanuvchi akkauntingizga bog'lang."));

        return member.getId();
    }

    @Transactional
    public void addRelationship(AddRelationshipRequest request) {
        FamilyMember from = familyMemberRepository.findById(request.getFromMemberId())
                .orElseThrow(() -> new ResourceNotFoundException("Oila a'zosi topilmadi: " + request.getFromMemberId()));
        FamilyMember to = familyMemberRepository.findById(request.getToMemberId())
                .orElseThrow(() -> new ResourceNotFoundException("Oila a'zosi topilmadi: " + request.getToMemberId()));

        if (relationshipRepository.findByFromMemberIdAndToMemberId(from.getId(), to.getId()).isPresent()) {
            throw new IllegalArgumentException("Munosabat allaqachon mavjud");
        }

        RelationshipType forwardType = request.getRelationshipType();

        // Auto-set target gender from relationship type
        Gender targetGender = inverseService.inferTargetGender(forwardType);
        if (targetGender != null && to.getGender() == null) {
            to.setGender(targetGender);
            familyMemberRepository.save(to);
        }

        // Forward relationship
        FamilyRelationship forward = FamilyRelationship.builder()
                .fromMember(from)
                .toMember(to)
                .relationshipType(forwardType)
                .build();
        relationshipRepository.save(forward);

        // Inverse relationship
        if (from.getGender() != null) {
            RelationshipType inverseType = inverseService.computeInverse(forwardType, from.getGender());
            FamilyRelationship inverse = FamilyRelationship.builder()
                    .fromMember(to)
                    .toMember(from)
                    .relationshipType(inverseType)
                    .build();
            relationshipRepository.save(inverse);
        }
    }

    @Transactional
    public FamilyTreeResponse addMemberWithRelationship(AddFamilyMemberWithRelationRequest request) {
        FamilyMember from = familyMemberRepository.findById(request.getFromMemberId())
                .orElseThrow(() -> new ResourceNotFoundException("Oila a'zosi topilmadi: " + request.getFromMemberId()));

        // Infer gender from relationship type if not provided
        Gender gender = request.getGender();
        if (gender == null) {
            gender = inverseService.inferTargetGender(request.getRelationshipType());
        }

        // Create new member
        FamilyMember newMember = FamilyMember.builder()
                .fullName(request.getFullName())
                .role(request.getRole())
                .gender(gender)
                .birthDate(request.getBirthDate())
                .phone(request.getPhone())
                .avatar(request.getAvatar())
                .build();

        FamilyMember saved = familyMemberRepository.save(newMember);

        // Create user account if requested
        if (Boolean.TRUE.equals(request.getCreateAccount())) {
            CredentialsInfo credentials = userService.createUserForFamilyMember(saved, "MEMBER");
            User createdUser = userRepository.findByUsername(credentials.getUsername())
                    .orElseThrow(() -> new ResourceNotFoundException("Yaratilgan foydalanuvchi topilmadi"));
            saved.setUser(createdUser);
            familyMemberRepository.save(saved);
        }

        // Create relationship
        AddRelationshipRequest relRequest = new AddRelationshipRequest();
        relRequest.setFromMemberId(from.getId());
        relRequest.setToMemberId(saved.getId());
        relRequest.setRelationshipType(request.getRelationshipType());
        addRelationship(relRequest);

        return getTree(from.getId());
    }

    @Transactional
    public void removeRelationship(Long fromId, Long toId) {
        relationshipRepository.deleteByFromMemberIdAndToMemberId(fromId, toId);
        relationshipRepository.deleteByFromMemberIdAndToMemberId(toId, fromId);
    }

    public List<RelationshipTypeDto> getRelationshipTypes() {
        return Arrays.stream(RelationshipType.values())
                .map(t -> new RelationshipTypeDto(t.name(), t.getLabel(), t.getCategory()))
                .collect(Collectors.toList());
    }

    private FamilyTreeMemberDto toMemberDto(FamilyMember m) {
        FamilyTreeMemberDto dto = new FamilyTreeMemberDto();
        dto.setId(m.getId());
        dto.setFullName(m.getFullName());
        dto.setRole(m.getRole());
        dto.setGender(m.getGender());
        dto.setBirthDate(m.getBirthDate());
        dto.setPhone(m.getPhone());
        dto.setAvatar(m.getAvatar());
        dto.setIsActive(m.getIsActive());
        dto.setUserId(m.getUser() != null ? m.getUser().getId() : null);
        return dto;
    }

    private FamilyRelationshipDto toRelationshipDto(FamilyRelationship r) {
        FamilyRelationshipDto dto = new FamilyRelationshipDto();
        dto.setId(r.getId());
        dto.setFromMemberId(r.getFromMember().getId());
        dto.setToMemberId(r.getToMember().getId());
        dto.setRelationshipType(r.getRelationshipType());
        dto.setLabel(r.getRelationshipType().getLabel());
        dto.setCategory(r.getRelationshipType().getCategory());
        return dto;
    }
}
