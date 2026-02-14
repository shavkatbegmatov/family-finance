package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.exception.BadRequestException;
import uz.familyfinance.api.exception.ConflictException;
import uz.familyfinance.api.dto.request.FamilyMemberRequest;
import uz.familyfinance.api.dto.request.RegisterSelfRequest;
import uz.familyfinance.api.dto.response.CredentialsInfo;
import uz.familyfinance.api.dto.response.FamilyMemberResponse;
import uz.familyfinance.api.entity.FamilyMember;
import uz.familyfinance.api.entity.User;
import uz.familyfinance.api.enums.FamilyRole;
import uz.familyfinance.api.enums.Gender;
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
    private final UserService userService;

    @Transactional
    public Page<FamilyMemberResponse> getAll(String search, Pageable pageable) {
        ensureSelfMemberActive();
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
                .lastName(request.getLastName())
                .role(request.getRole())
                .gender(request.getGender())
                .birthDate(request.getBirthDate())
                .birthPlace(request.getBirthPlace())
                .deathDate(request.getDeathDate())
                .phone(request.getPhone())
                .avatar(request.getAvatar())
                .build();

        if (request.getUserId() != null) {
            User user = userRepository.findById(request.getUserId())
                    .orElseThrow(() -> new ResourceNotFoundException("Foydalanuvchi topilmadi"));
            member.setUser(user);
        }

        FamilyMember saved = familyMemberRepository.save(member);

        // Avtomatik user account yaratish
        if (Boolean.TRUE.equals(request.getCreateAccount()) && saved.getUser() == null) {
            CredentialsInfo credentials = userService.createUserForFamilyMember(saved, "MEMBER");
            // Yaratilgan user'ni member'ga biriktirish
            User createdUser = userRepository.findByUsername(credentials.getUsername())
                    .orElseThrow(() -> new ResourceNotFoundException("Yaratilgan foydalanuvchi topilmadi"));
            saved.setUser(createdUser);
            familyMemberRepository.save(saved);
            return toResponse(saved, credentials);
        }

        return toResponse(saved);
    }

    @Transactional
    public FamilyMemberResponse registerSelf(RegisterSelfRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Foydalanuvchi topilmadi"));

        familyMemberRepository.findByUserId(currentUser.getId()).ifPresent(existing -> {
            throw new ConflictException("Siz allaqachon oila a'zosiga bog'langansiz");
        });

        FamilyRole role = request.getGender() == Gender.MALE ? FamilyRole.FATHER : FamilyRole.MOTHER;

        FamilyMember member = FamilyMember.builder()
                .fullName(request.getFullName())
                .gender(request.getGender())
                .role(role)
                .user(currentUser)
                .build();

        FamilyMember saved = familyMemberRepository.save(member);
        return toResponse(saved);
    }

    @Transactional
    public FamilyMemberResponse update(Long id, FamilyMemberRequest request) {
        FamilyMember member = findById(id);
        member.setFullName(request.getFullName());
        member.setLastName(request.getLastName());
        member.setRole(request.getRole());
        member.setGender(request.getGender());
        member.setBirthDate(request.getBirthDate());
        member.setBirthPlace(request.getBirthPlace());
        member.setDeathDate(request.getDeathDate());
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

        // O'z-o'zini o'chirishdan himoya
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByUsername(username).orElse(null);
        if (currentUser != null && member.getUser() != null
                && member.getUser().getId().equals(currentUser.getId())) {
            throw new BadRequestException("O'zingizning profilingizni o'chirib bo'lmaydi");
        }

        member.setIsActive(false);
        familyMemberRepository.save(member);
    }

    @Transactional(readOnly = true)
    public List<FamilyMember> getAllEntities() {
        return familyMemberRepository.findByIsActiveTrue();
    }

    private void ensureSelfMemberActive() {
        try {
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            User currentUser = userRepository.findByUsername(username).orElse(null);
            if (currentUser == null) return;

            familyMemberRepository.findByUserId(currentUser.getId()).ifPresent(member -> {
                if (Boolean.FALSE.equals(member.getIsActive())) {
                    member.setIsActive(true);
                    familyMemberRepository.save(member);
                }
            });
        } catch (Exception e) {
            log.warn("Self member tekshirishda xatolik: {}", e.getMessage());
        }
    }

    private FamilyMember findById(Long id) {
        return familyMemberRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Oila a'zosi topilmadi: " + id));
    }

    private FamilyMemberResponse toResponse(FamilyMember m) {
        return toResponse(m, null);
    }

    private FamilyMemberResponse toResponse(FamilyMember m, CredentialsInfo credentials) {
        FamilyMemberResponse r = new FamilyMemberResponse();
        r.setId(m.getId());
        r.setFullName(m.getFullName());
        r.setLastName(m.getLastName());
        r.setRole(m.getRole());
        r.setGender(m.getGender());
        r.setBirthDate(m.getBirthDate());
        r.setBirthPlace(m.getBirthPlace());
        r.setDeathDate(m.getDeathDate());
        r.setPhone(m.getPhone());
        r.setAvatar(m.getAvatar());
        r.setIsActive(m.getIsActive());
        r.setCreatedAt(m.getCreatedAt());
        if (m.getUser() != null) {
            r.setUserId(m.getUser().getId());
            r.setUserName(m.getUser().getUsername());
        }
        r.setCredentials(credentials);
        return r;
    }
}
