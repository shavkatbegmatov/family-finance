package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.dto.familygroup.FamilyGroupMemberDto;
import uz.familyfinance.api.dto.familygroup.FamilyGroupInviteCandidateDto;
import uz.familyfinance.api.dto.familygroup.FamilyGroupResponse;
import uz.familyfinance.api.dto.response.HouseholdDashboardResponse;
import uz.familyfinance.api.entity.Account;
import uz.familyfinance.api.entity.FamilyGroup;
import uz.familyfinance.api.entity.FamilyMember;
import uz.familyfinance.api.entity.User;
import uz.familyfinance.api.enums.TransactionType;
import uz.familyfinance.api.exception.ResourceNotFoundException;
import uz.familyfinance.api.repository.AccountRepository;
import uz.familyfinance.api.repository.FamilyGroupRepository;
import uz.familyfinance.api.repository.FamilyMemberRepository;
import uz.familyfinance.api.repository.TransactionRepository;
import uz.familyfinance.api.repository.UserRepository;
import uz.familyfinance.api.security.CustomUserDetails;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import uz.familyfinance.api.repository.FamilyAddressHistoryRepository;
import uz.familyfinance.api.entity.FamilyAddressHistory;
import uz.familyfinance.api.dto.familygroup.FamilyAddressHistoryDto;
import uz.familyfinance.api.dto.familygroup.FamilyAddressRequest;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class FamilyGroupService {

    private final FamilyGroupRepository familyGroupRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final UserRepository userRepository;
    private final TransactionRepository transactionRepository;
    private final AccountRepository accountRepository;
    private final FamilyAddressHistoryRepository familyAddressHistoryRepository;

    private String generateUniqueCode() {
        return UUID.randomUUID().toString().replaceAll("-", "").substring(0, 6).toUpperCase();
    }

    @Transactional
    public FamilyGroupResponse getMyFamilyGroup(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Foydalanuvchi topilmadi"));

        FamilyGroup familyGroup = user.getFamilyGroup();
        if (familyGroup == null) {
            throw new ResourceNotFoundException("Siz biron bir Oila guruhiga a'zo emassiz");
        }

        // Ensure unique code exists for old records
        if (familyGroup.getUniqueCode() == null) {
            familyGroup.setUniqueCode(generateUniqueCode());
            familyGroupRepository.save(familyGroup);
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
                .uniqueCode(familyGroup.getUniqueCode())
                .currentAddress(familyGroup.getCurrentAddress())
                .members(memberDtos)
                .build();
    }

    @Transactional
    public void addMember(Long adminUserId, String usernameToAdd) {
        FamilyGroup familyGroup = requireAdminFamilyGroup(adminUserId);

        User userToAdd = userRepository.findByUsername(usernameToAdd)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Tizimdan bunday foydalanuvchi topilmadi: " + usernameToAdd));

        if (userToAdd.getFamilyGroup() != null && userToAdd.getFamilyGroup().getId().equals(familyGroup.getId())) {
            throw new IllegalArgumentException("Bu foydalanuvchi allaqachon oilangiz a'zosi");
        }

        if (userToAdd.getFamilyGroup() != null) {
            throw new IllegalArgumentException(
                    "Bu foydalanuvchi boshqa oila guruhiga a'zo. Avval o'sha guruhdan chiqarilishi kerak");
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

    @Transactional(readOnly = true)
    public List<FamilyGroupInviteCandidateDto> searchInviteCandidates(Long adminUserId, String search, int size) {
        FamilyGroup familyGroup = requireAdminFamilyGroup(adminUserId);

        int safeSize = Math.max(1, Math.min(size, 25));
        String normalizedSearch = search != null ? search.trim() : "";
        PageRequest pageable = PageRequest.of(0, safeSize, Sort.by(Sort.Direction.ASC, "fullName"));

        List<User> users = normalizedSearch.isBlank()
                ? userRepository.findByActive(true, pageable).getContent()
                : userRepository.searchUsersByActive(normalizedSearch, true, pageable).getContent();

        List<User> filteredUsers = users.stream()
                .filter(user -> !user.getId().equals(adminUserId))
                .collect(Collectors.toList());

        List<Long> userIds = filteredUsers.stream().map(User::getId).collect(Collectors.toList());
        Map<Long, FamilyMember> linkedMembersByUserId = userIds.isEmpty()
                ? Map.of()
                : familyMemberRepository.findByUserIdIn(userIds).stream()
                        .filter(member -> member.getUser() != null)
                        .collect(Collectors.toMap(member -> member.getUser().getId(), member -> member));

        Long currentGroupId = familyGroup.getId();

        return filteredUsers.stream()
                .map(user -> {
                    FamilyMember linkedMember = linkedMembersByUserId.get(user.getId());
                    FamilyGroup linkedGroup = user.getFamilyGroup();
                    boolean alreadyInCurrentGroup = linkedGroup != null && currentGroupId.equals(linkedGroup.getId());

                    return FamilyGroupInviteCandidateDto.builder()
                            .userId(user.getId())
                            .username(user.getUsername())
                            .fullName(user.getFullName())
                            .email(user.getEmail())
                            .phone(user.getPhone())
                            .active(user.getActive())
                            .familyGroupId(linkedGroup != null ? linkedGroup.getId() : null)
                            .familyGroupName(linkedGroup != null ? linkedGroup.getName() : null)
                            .alreadyInCurrentGroup(alreadyInCurrentGroup)
                            .linkedFamilyMemberId(linkedMember != null ? linkedMember.getId() : null)
                            .linkedFamilyMemberName(linkedMember != null ? linkedMember.getDisplayName() : null)
                            .linkedFamilyRole(linkedMember != null && linkedMember.getRole() != null
                                    ? linkedMember.getRole().name()
                                    : null)
                            .linkedFamilyGender(linkedMember != null && linkedMember.getGender() != null
                                    ? linkedMember.getGender().name()
                                    : null)
                            .linkedFamilyBirthDate(linkedMember != null ? linkedMember.getBirthDate() : null)
                            .linkedFamilyBirthPlace(linkedMember != null ? linkedMember.getBirthPlace() : null)
                            .linkedFamilyPhone(linkedMember != null ? linkedMember.getPhone() : null)
                            .linkedFamilyMemberActive(linkedMember != null ? linkedMember.getIsActive() : null)
                            .build();
                })
                .collect(Collectors.toList());
    }

    @Transactional
    public void removeMember(Long adminUserId, Long familyMemberId) {
        FamilyGroup familyGroup = requireAdminFamilyGroup(adminUserId);

        FamilyMember member = familyMemberRepository.findById(familyMemberId)
                .orElseThrow(() -> new ResourceNotFoundException("Oila a'zosi topilmadi"));

        if (member.getFamilyGroup() == null
                || !member.getFamilyGroup().getId().equals(familyGroup.getId())) {
            throw new IllegalArgumentException("Bu a'zo sizning oila guruhingizda emas");
        }

        User linkedUser = member.getUser();

        // Admin o'zini o'chira olmaydi
        if (linkedUser != null && linkedUser.getId().equals(adminUserId)) {
            throw new IllegalArgumentException("Siz o'zingizni guruhdan chiqarib yubora olmaysiz!");
        }

        if (linkedUser != null) {
            // User'ga bog'langan a'zo -- yangi guruh yaratib ko'chirish
            FamilyGroup newGroup = FamilyGroup.builder()
                    .name(linkedUser.getFullName() + " Oilasi")
                    .admin(linkedUser)
                    .active(true)
                    .uniqueCode(generateUniqueCode())
                    .build();
            familyGroupRepository.save(newGroup);

            linkedUser.setFamilyGroup(newGroup);
            userRepository.save(linkedUser);

            member.setFamilyGroup(newGroup);
            familyMemberRepository.save(member);
        } else {
            // User'ga bog'lanmagan a'zo -- guruhdan chiqarish
            member.setFamilyGroup(null);
            familyMemberRepository.save(member);
        }
    }

    @Transactional
    public void changeAddress(Long userId, FamilyAddressRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Foydalanuvchi topilmadi"));

        FamilyGroup familyGroup = user.getFamilyGroup();
        if (familyGroup == null) {
            throw new ResourceNotFoundException("Oila guruhi topilmadi");
        }

        LocalDate moveIn = request.getMoveInDate() != null ? request.getMoveInDate() : LocalDate.now();

        FamilyAddressHistory newEntry = FamilyAddressHistory.builder()
                .familyGroup(familyGroup)
                .address(request.getAddress())
                .moveInDate(moveIn)
                .moveOutDate(request.getMoveOutDate())
                .isCurrent(false)
                .build();
        familyAddressHistoryRepository.save(newEntry);

        List<FamilyAddressHistory> histories = familyAddressHistoryRepository
                .findByFamilyGroupIdOrderByMoveInDateAsc(familyGroup.getId());

        FamilyAddressHistory currentHistory = null;
        for (int i = 0; i < histories.size(); i++) {
            FamilyAddressHistory h = histories.get(i);

            if (h.getMoveOutDate() == null && i < histories.size() - 1) {
                h.setMoveOutDate(histories.get(i + 1).getMoveInDate());
            }

            h.setIsCurrent(false);
            currentHistory = h;
        }

        if (currentHistory != null) {
            currentHistory.setIsCurrent(true);
            familyGroup.setCurrentAddress(currentHistory.getAddress());
            familyGroupRepository.save(familyGroup);
        }

        familyAddressHistoryRepository.saveAll(histories);
    }

    @Transactional(readOnly = true)
    public List<FamilyAddressHistoryDto> getAddressHistory(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Foydalanuvchi topilmadi"));

        FamilyGroup familyGroup = user.getFamilyGroup();
        if (familyGroup == null) {
            throw new ResourceNotFoundException("Oila guruhi topilmadi");
        }

        return familyAddressHistoryRepository.findByFamilyGroupIdOrderByMoveInDateDesc(familyGroup.getId())
                .stream()
                .map(history -> FamilyAddressHistoryDto.builder()
                        .id(history.getId())
                        .address(history.getAddress())
                        .moveInDate(history.getMoveInDate())
                        .moveOutDate(history.getMoveOutDate())
                        .isCurrent(history.getIsCurrent())
                        .build())
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public HouseholdDashboardResponse getHouseholdDashboard(CustomUserDetails currentUser) {
        User user = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Foydalanuvchi topilmadi"));
        FamilyGroup familyGroup = user.getFamilyGroup();
        if (familyGroup == null) {
            throw new ResourceNotFoundException("Siz biron bir Oila guruhiga a'zo emassiz");
        }

        Long adminId = familyGroup.getAdmin() != null ? familyGroup.getAdmin().getId() : null;
        boolean isAdmin = adminId != null && adminId.equals(user.getId());

        // 1. Guruh a'zolarini olish
        List<FamilyMember> members = familyMemberRepository.findByFamilyGroupId(familyGroup.getId());

        // 2. Shu oydagi income/expense hisoblash
        LocalDate now = LocalDate.now();
        LocalDateTime monthStart = now.withDayOfMonth(1).atStartOfDay();
        LocalDateTime monthEnd = now.withDayOfMonth(now.lengthOfMonth()).atTime(LocalTime.MAX);

        List<Long> memberIds = members.stream().map(FamilyMember::getId).collect(Collectors.toList());

        // Member bo'yicha tranzaksiya yig'indilari
        Map<Long, BigDecimal> incomeMap = new HashMap<>();
        Map<Long, BigDecimal> expenseMap = new HashMap<>();

        if (!memberIds.isEmpty()) {
            List<Object[]> sums = transactionRepository.sumByMemberIdsGroupedByType(memberIds, monthStart, monthEnd);
            for (Object[] row : sums) {
                Long memberId = (Long) row[0];
                TransactionType type = (TransactionType) row[1];
                BigDecimal amount = (BigDecimal) row[2];
                if (type == TransactionType.INCOME) {
                    incomeMap.put(memberId, amount);
                } else if (type == TransactionType.EXPENSE) {
                    expenseMap.put(memberId, amount);
                }
            }
        }

        // 3. A'zo summary'larni yig'ish
        List<HouseholdDashboardResponse.HouseholdMemberSummary> memberSummaries = members.stream()
                .filter(m -> Boolean.TRUE.equals(m.getIsActive()))
                .map(m -> {
                    BigDecimal income = incomeMap.getOrDefault(m.getId(), BigDecimal.ZERO);
                    BigDecimal expense = expenseMap.getOrDefault(m.getId(), BigDecimal.ZERO);
                    boolean memberIsAdmin = m.getUser() != null && adminId != null
                            && adminId.equals(m.getUser().getId());
                    return HouseholdDashboardResponse.HouseholdMemberSummary.builder()
                            .id(m.getId())
                            .fullName(m.getFullName())
                            .role(m.getRole() != null ? m.getRole().name() : null)
                            .gender(m.getGender() != null ? m.getGender().name() : null)
                            .phone(m.getPhone())
                            .avatar(m.getAvatar())
                            .userId(m.getUser() != null ? m.getUser().getId() : null)
                            .username(m.getUser() != null ? m.getUser().getUsername() : null)
                            .isAdmin(memberIsAdmin)
                            .monthlyIncome(income)
                            .monthlyExpense(expense)
                            .build();
                })
                .collect(Collectors.toList());

        // 4. FAMILY scope account'larni olish
        List<Account> familyAccounts = accountRepository.findFamilyAccountsByGroupId(familyGroup.getId());
        List<HouseholdDashboardResponse.HouseholdAccountSummary> accountSummaries = familyAccounts.stream()
                .map(a -> HouseholdDashboardResponse.HouseholdAccountSummary.builder()
                        .id(a.getId())
                        .name(a.getName())
                        .accountType(a.getType() != null ? a.getType().name() : null)
                        .balance(a.getBalance())
                        .currency(a.getCurrency())
                        .ownerName(a.getOwner() != null ? a.getOwner().getFullName() : null)
                        .build())
                .collect(Collectors.toList());

        // 5. Jami summalarni hisoblash
        BigDecimal totalIncome = memberSummaries.stream()
                .map(HouseholdDashboardResponse.HouseholdMemberSummary::getMonthlyIncome)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalExpense = memberSummaries.stream()
                .map(HouseholdDashboardResponse.HouseholdMemberSummary::getMonthlyExpense)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return HouseholdDashboardResponse.builder()
                .groupName(familyGroup.getName())
                .adminId(adminId)
                .isAdmin(isAdmin)
                .members(memberSummaries)
                .familyAccounts(accountSummaries)
                .totalMonthlyIncome(totalIncome)
                .totalMonthlyExpense(totalExpense)
                .build();
    }

    private FamilyGroup requireAdminFamilyGroup(Long adminUserId) {
        User admin = userRepository.findById(adminUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin topilmadi"));

        FamilyGroup familyGroup = admin.getFamilyGroup();
        if (familyGroup == null || familyGroup.getAdmin() == null || !familyGroup.getAdmin().getId().equals(adminUserId)) {
            throw new IllegalArgumentException(
                    "Siz faqat o'z oila guruhingizga a'zo qo'sha olasiz va guruh admini bo'lishingiz kerak");
        }

        return familyGroup;
    }
}
