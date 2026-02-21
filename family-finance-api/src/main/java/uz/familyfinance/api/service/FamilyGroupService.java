package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.dto.familygroup.FamilyGroupMemberDto;
import uz.familyfinance.api.dto.familygroup.FamilyGroupResponse;
import uz.familyfinance.api.entity.FamilyGroup;
import uz.familyfinance.api.entity.FamilyMember;
import uz.familyfinance.api.entity.User;
import uz.familyfinance.api.exception.ResourceNotFoundException;
import uz.familyfinance.api.repository.FamilyGroupRepository;
import uz.familyfinance.api.repository.FamilyMemberRepository;
import uz.familyfinance.api.repository.UserRepository;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class FamilyGroupService {

    private final FamilyGroupRepository familyGroupRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public FamilyGroupResponse getMyFamilyGroup(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Foydalanuvchi topilmadi"));

        FamilyGroup familyGroup = user.getFamilyGroup();
        if (familyGroup == null) {
            throw new ResourceNotFoundException("Siz biron bir Oila guruhiga a'zo emassiz");
        }

        List<FamilyMember> members = familyMemberRepository.findByFamilyGroupId(familyGroup.getId());

        List<FamilyGroupMemberDto> memberDtos = members.stream().map(fm -> {
            FamilyGroupMemberDto dto = new FamilyGroupMemberDto();
            dto.setId(fm.getId());
            dto.setFullName(fm.getFullName());
            dto.setPhone(fm.getPhone());
            dto.setRole(fm.getRole() != null ? fm.getRole().name() : null);
            if (fm.getUser() != null) {
                dto.setUserId(fm.getUser().getId());
                dto.setUsername(fm.getUser().getUsername());
            }
            return dto;
        }).collect(Collectors.toList());

        return FamilyGroupResponse.builder()
                .id(familyGroup.getId())
                .name(familyGroup.getName())
                .adminId(familyGroup.getAdmin() != null ? familyGroup.getAdmin().getId() : null)
                .active(familyGroup.getActive())
                .members(memberDtos)
                .build();
    }

    @Transactional
    public void addMember(Long adminUserId, String usernameToAdd) {
        User admin = userRepository.findById(adminUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin topilmadi"));

        FamilyGroup familyGroup = admin.getFamilyGroup();
        if (familyGroup == null || !familyGroup.getAdmin().getId().equals(adminUserId)) {
            throw new IllegalArgumentException(
                    "Siz faqat o'z oila guruhingizga a'zo qo'sha olasiz va guruh admini bo'lishingiz kerak");
        }

        User userToAdd = userRepository.findByUsername(usernameToAdd)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Tizimdan bunday foydalanuvchi topilmadi: " + usernameToAdd));

        if (userToAdd.getFamilyGroup() != null && userToAdd.getFamilyGroup().getId().equals(familyGroup.getId())) {
            throw new IllegalArgumentException("Bu foydalanuvchi allaqachon oilangiz a'zosi");
        }

        userToAdd.setFamilyGroup(familyGroup);
        userRepository.save(userToAdd);

        // Update family member record if it exists
        FamilyMember memberRecord = familyMemberRepository.findByUserId(userToAdd.getId())
                .orElse(null);
        if (memberRecord != null) {
            memberRecord.setFamilyGroup(familyGroup);
            familyMemberRepository.save(memberRecord);
        }
    }

    @Transactional
    public void removeMember(Long adminUserId, Long memberUserId) {
        User admin = userRepository.findById(adminUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin topilmadi"));

        FamilyGroup familyGroup = admin.getFamilyGroup();
        if (familyGroup == null || !familyGroup.getAdmin().getId().equals(adminUserId)) {
            throw new IllegalArgumentException("Siz Oila guruhi admini emassiz");
        }

        if (adminUserId.equals(memberUserId)) {
            throw new IllegalArgumentException("Siz o'zingizni guruhdan chiqarib yubora olmaysiz!");
        }

        User userToRemove = userRepository.findById(memberUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Foydalanuvchi topilmadi"));

        if (userToRemove.getFamilyGroup() == null
                || !userToRemove.getFamilyGroup().getId().equals(familyGroup.getId())) {
            throw new IllegalArgumentException("Bu foydalanuvchi sizning oila guruhingizda emas");
        }

        // We could just set their family group to a new empty group, or null (but null
        // might break things where a user must have a group).
        // Let's create a new group for them like the migration did.
        FamilyGroup newGroup = FamilyGroup.builder()
                .name(userToRemove.getFullName() + " Oilasi")
                .admin(userToRemove)
                .active(true)
                .build();
        familyGroupRepository.save(newGroup);

        userToRemove.setFamilyGroup(newGroup);
        userRepository.save(userToRemove);

        // Update family member record
        FamilyMember memberRecord = familyMemberRepository.findByUserId(userToRemove.getId()).orElse(null);
        if (memberRecord != null) {
            memberRecord.setFamilyGroup(newGroup);
            familyMemberRepository.save(memberRecord);
        }
    }
}
