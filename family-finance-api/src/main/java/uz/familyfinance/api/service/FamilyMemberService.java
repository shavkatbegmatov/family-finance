package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.dto.request.FamilyMemberRequest;
import uz.familyfinance.api.dto.response.FamilyMemberResponse;
import uz.familyfinance.api.entity.FamilyMember;
import uz.familyfinance.api.entity.User;
import uz.familyfinance.api.exception.ResourceNotFoundException;
import uz.familyfinance.api.repository.FamilyMemberRepository;
import uz.familyfinance.api.repository.UserRepository;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class FamilyMemberService {

    private final FamilyMemberRepository familyMemberRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public Page<FamilyMemberResponse> getAll(String search, Pageable pageable) {
        if (search != null && !search.isBlank()) {
            return familyMemberRepository.search(search, pageable).map(this::toResponse);
        }
        return familyMemberRepository.findByIsActiveTrue(pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public List<FamilyMemberResponse> getAllActive() {
        return familyMemberRepository.findByIsActiveTrue().stream()
                .map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public FamilyMemberResponse getById(Long id) {
        return toResponse(findById(id));
    }

    @Transactional
    public FamilyMemberResponse create(FamilyMemberRequest request) {
        FamilyMember member = FamilyMember.builder()
                .fullName(request.getFullName())
                .role(request.getRole())
                .birthDate(request.getBirthDate())
                .phone(request.getPhone())
                .avatar(request.getAvatar())
                .build();

        if (request.getUserId() != null) {
            User user = userRepository.findById(request.getUserId())
                    .orElseThrow(() -> new ResourceNotFoundException("Foydalanuvchi topilmadi"));
            member.setUser(user);
        }

        return toResponse(familyMemberRepository.save(member));
    }

    @Transactional
    public FamilyMemberResponse update(Long id, FamilyMemberRequest request) {
        FamilyMember member = findById(id);
        member.setFullName(request.getFullName());
        member.setRole(request.getRole());
        member.setBirthDate(request.getBirthDate());
        member.setPhone(request.getPhone());
        member.setAvatar(request.getAvatar());

        if (request.getUserId() != null) {
            User user = userRepository.findById(request.getUserId())
                    .orElseThrow(() -> new ResourceNotFoundException("Foydalanuvchi topilmadi"));
            member.setUser(user);
        } else {
            member.setUser(null);
        }

        return toResponse(familyMemberRepository.save(member));
    }

    @Transactional
    public void delete(Long id) {
        FamilyMember member = findById(id);
        member.setIsActive(false);
        familyMemberRepository.save(member);
    }

    @Transactional(readOnly = true)
    public List<FamilyMember> getAllEntities() {
        return familyMemberRepository.findByIsActiveTrue();
    }

    private FamilyMember findById(Long id) {
        return familyMemberRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Oila a'zosi topilmadi: " + id));
    }

    private FamilyMemberResponse toResponse(FamilyMember m) {
        FamilyMemberResponse r = new FamilyMemberResponse();
        r.setId(m.getId());
        r.setFullName(m.getFullName());
        r.setRole(m.getRole());
        r.setBirthDate(m.getBirthDate());
        r.setPhone(m.getPhone());
        r.setAvatar(m.getAvatar());
        r.setIsActive(m.getIsActive());
        r.setCreatedAt(m.getCreatedAt());
        if (m.getUser() != null) {
            r.setUserId(m.getUser().getId());
            r.setUserName(m.getUser().getUsername());
        }
        return r;
    }
}
