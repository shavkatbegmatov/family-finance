package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.dto.familygroup.FamilyGroupMemberDto;
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

@Service
@RequiredArgsConstructor
@Slf4j
public class FamilyGroupService {

    private final FamilyGroupRepository familyGroupRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final UserRepository userRepository;
    private final TransactionRepository transactionRepository;
    private final AccountRepository accountRepository;

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
    public void removeMember(Long adminUserId, Long familyMemberId) {
        User admin = userRepository.findById(adminUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin topilmadi"));

        FamilyGroup familyGroup = admin.getFamilyGroup();
        if (familyGroup == null || !familyGroup.getAdmin().getId().equals(adminUserId)) {
            throw new IllegalArgumentException("Siz Oila guruhi admini emassiz");
        }

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
}
