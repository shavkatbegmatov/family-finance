package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.access.AccessDeniedException;
import uz.familyfinance.api.exception.BadRequestException;
import uz.familyfinance.api.exception.ConflictException;
import uz.familyfinance.api.dto.request.FamilyMemberRequest;
import uz.familyfinance.api.dto.request.RegisterSelfRequest;
import uz.familyfinance.api.dto.request.UpdateSelfRequest;
import uz.familyfinance.api.dto.response.CredentialsInfo;
import uz.familyfinance.api.dto.response.FamilyMemberResponse;
import uz.familyfinance.api.dto.response.MemberFinancialSummaryResponse;
import uz.familyfinance.api.entity.Account;
import uz.familyfinance.api.entity.Category;
import uz.familyfinance.api.entity.FamilyMember;
import uz.familyfinance.api.entity.Transaction;
import uz.familyfinance.api.entity.User;
import uz.familyfinance.api.enums.FamilyRole;
import uz.familyfinance.api.enums.Gender;
import uz.familyfinance.api.enums.TransactionType;
import uz.familyfinance.api.exception.ResourceNotFoundException;
import uz.familyfinance.api.repository.AccountRepository;
import uz.familyfinance.api.repository.CategoryRepository;
import uz.familyfinance.api.repository.FamilyMemberRepository;
import uz.familyfinance.api.repository.TransactionRepository;
import uz.familyfinance.api.repository.UserRepository;

import org.springframework.data.domain.PageRequest;
import uz.familyfinance.api.security.CustomUserDetails;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class FamilyMemberService {

    private final FamilyMemberRepository familyMemberRepository;
    private final UserRepository userRepository;
    private final UserService userService;
    private final TransactionRepository transactionRepository;
    private final AccountRepository accountRepository;
    private final CategoryRepository categoryRepository;

    @Transactional
    public Page<FamilyMemberResponse> getAll(String search, Pageable pageable, CustomUserDetails currentUser) {
        ensureSelfMemberActive();
        Long familyGroupId = currentUser.getUser().getFamilyGroup() != null
                ? currentUser.getUser().getFamilyGroup().getId()
                : -1L;
        boolean isAdmin = currentUser.isAdmin();

        if (search != null && !search.isBlank()) {
            return familyMemberRepository.searchWithAccess(search, familyGroupId, isAdmin, pageable)
                    .map(this::toResponse);
        }
        return familyMemberRepository.findAccessibleMembers(familyGroupId, isAdmin, pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public List<FamilyMemberResponse> getAllActive(CustomUserDetails currentUser) {
        Long familyGroupId = currentUser.getUser().getFamilyGroup() != null
                ? currentUser.getUser().getFamilyGroup().getId()
                : -1L;
        boolean isAdmin = currentUser.isAdmin();
        return familyMemberRepository.findAccessibleActiveMembers(familyGroupId, isAdmin).stream()
                .map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public FamilyMemberResponse getById(Long id, CustomUserDetails currentUser) {
        FamilyMember member = findById(id);
        checkAccess(member, currentUser);
        return toResponse(member);
    }

    @Transactional(readOnly = true)
    public MemberFinancialSummaryResponse getFinancialSummary(Long id, CustomUserDetails currentUser) {
        FamilyMember member = findById(id);
        checkAccess(member, currentUser);

        FamilyMemberResponse profile = toResponse(member);

        // Joriy oy date range
        LocalDate now = LocalDate.now();
        LocalDateTime monthStart = now.withDayOfMonth(1).atStartOfDay();
        LocalDateTime monthEnd = now.plusMonths(1).withDayOfMonth(1).atStartOfDay().minusSeconds(1);

        // KPI: oylik daromad va xarajat
        BigDecimal monthlyIncome = transactionRepository.sumIncomeByMemberAndDateRange(id, monthStart, monthEnd);
        BigDecimal monthlyExpense = transactionRepository.sumExpenseByMemberAndDateRange(id, monthStart, monthEnd);
        BigDecimal netBalance = monthlyIncome.subtract(monthlyExpense);

        // Hisoblar
        List<Account> ownedAccounts = accountRepository.findByOwnerId(id);
        BigDecimal totalAccountBalance = ownedAccounts.stream()
                .map(Account::getBalance)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<MemberFinancialSummaryResponse.AccountSummary> accounts = ownedAccounts.stream()
                .map(a -> MemberFinancialSummaryResponse.AccountSummary.builder()
                        .id(a.getId())
                        .name(a.getName())
                        .type(a.getType() != null ? a.getType().name() : null)
                        .balance(a.getBalance())
                        .currency(a.getCurrency())
                        .status(a.getStatus() != null ? a.getStatus().name() : "ACTIVE")
                        .scope(a.getScope() != null ? a.getScope().name() : "PERSONAL")
                        .accCode(a.getAccCode())
                        .build())
                .collect(Collectors.toList());

        // Kategoriya bo'yicha xarajat
        Map<Long, Category> categoryCache = new HashMap<>();
        List<MemberFinancialSummaryResponse.CategoryBreakdown> expenseByCategory =
                buildCategoryBreakdown(transactionRepository.sumExpenseByMemberGroupedByCategory(id, monthStart, monthEnd), categoryCache);

        // Kategoriya bo'yicha daromad
        List<MemberFinancialSummaryResponse.CategoryBreakdown> incomeByCategory =
                buildCategoryBreakdown(transactionRepository.sumIncomeByMemberGroupedByCategory(id, monthStart, monthEnd), categoryCache);

        // 6 oylik trend
        LocalDate sixMonthsAgo = now.minusMonths(5).withDayOfMonth(1);
        LocalDateTime trendFrom = sixMonthsAgo.atStartOfDay();

        Map<String, Map<TransactionType, BigDecimal>> monthlyMap = new HashMap<>();
        for (Object[] row : transactionRepository.sumByMemberGroupedByTypeAndMonth(id, trendFrom, monthEnd)) {
            TransactionType type = (TransactionType) row[0];
            int month = ((Number) row[1]).intValue();
            int year = ((Number) row[2]).intValue();
            String key = year + "-" + month;
            monthlyMap.computeIfAbsent(key, k -> new HashMap<>()).put(type, (BigDecimal) row[3]);
        }

        List<MemberFinancialSummaryResponse.MonthlyTrend> monthlyTrend = new ArrayList<>();
        for (int i = 5; i >= 0; i--) {
            LocalDate month = now.minusMonths(i);
            String key = month.getYear() + "-" + month.getMonthValue();
            Map<TransactionType, BigDecimal> sums = monthlyMap.getOrDefault(key, Map.of());
            monthlyTrend.add(MemberFinancialSummaryResponse.MonthlyTrend.builder()
                    .month(month.getMonth().name())
                    .year(month.getYear())
                    .income(sums.getOrDefault(TransactionType.INCOME, BigDecimal.ZERO))
                    .expense(sums.getOrDefault(TransactionType.EXPENSE, BigDecimal.ZERO))
                    .build());
        }

        // Oxirgi 5 tranzaksiya
        List<Transaction> recentTx = transactionRepository.findRecentByMember(id, PageRequest.of(0, 5));
        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
        List<MemberFinancialSummaryResponse.RecentTransaction> recentTransactions = recentTx.stream()
                .map(t -> MemberFinancialSummaryResponse.RecentTransaction.builder()
                        .id(t.getId())
                        .type(t.getType() != null ? t.getType().name() : null)
                        .amount(t.getAmount())
                        .categoryName(t.getCategory() != null ? t.getCategory().getName() : null)
                        .description(t.getDescription())
                        .transactionDate(t.getTransactionDate() != null ? t.getTransactionDate().format(dtf) : null)
                        .status(t.getStatus() != null ? t.getStatus().name() : "CONFIRMED")
                        .build())
                .collect(Collectors.toList());

        return MemberFinancialSummaryResponse.builder()
                .profile(profile)
                .monthlyIncome(monthlyIncome)
                .monthlyExpense(monthlyExpense)
                .netBalance(netBalance)
                .totalAccountBalance(totalAccountBalance)
                .accounts(accounts)
                .expenseByCategory(expenseByCategory)
                .incomeByCategory(incomeByCategory)
                .monthlyTrend(monthlyTrend)
                .recentTransactions(recentTransactions)
                .build();
    }

    private List<MemberFinancialSummaryResponse.CategoryBreakdown> buildCategoryBreakdown(
            List<Object[]> rawData, Map<Long, Category> categoryCache) {
        BigDecimal total = rawData.stream()
                .map(row -> (BigDecimal) row[1])
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return rawData.stream()
                .map(row -> {
                    Long catId = (Long) row[0];
                    BigDecimal amount = (BigDecimal) row[1];
                    Category cat = categoryCache.computeIfAbsent(catId,
                            cId -> categoryRepository.findById(cId).orElse(null));
                    double pct = total.compareTo(BigDecimal.ZERO) > 0
                            ? amount.multiply(BigDecimal.valueOf(100)).divide(total, 2, RoundingMode.HALF_UP).doubleValue()
                            : 0;
                    return MemberFinancialSummaryResponse.CategoryBreakdown.builder()
                            .categoryId(catId)
                            .categoryName(cat != null ? cat.getName() : "Noma'lum")
                            .categoryColor(cat != null ? cat.getColor() : null)
                            .amount(amount)
                            .percentage(pct)
                            .build();
                })
                .filter(b -> b.getAmount().compareTo(BigDecimal.ZERO) > 0)
                .collect(Collectors.toList());
    }

    @Transactional
    public FamilyMemberResponse create(FamilyMemberRequest request, CustomUserDetails currentUser) {
        FamilyMember member = FamilyMember.builder()
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .middleName(request.getMiddleName())
                .role(request.getRole() != null ? request.getRole() : FamilyRole.OTHER)
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

        // FamilyGroup o'rnatish (sidebar bug fix)
        if (currentUser.getUser().getFamilyGroup() != null) {
            member.setFamilyGroup(currentUser.getUser().getFamilyGroup());
        }

        FamilyMember saved = familyMemberRepository.save(member);

        // Avtomatik user account yaratish
        if (Boolean.TRUE.equals(request.getCreateAccount()) && saved.getUser() == null) {
            String roleCode = request.getAccountRole() != null && !request.getAccountRole().isBlank()
                    ? request.getAccountRole()
                    : "MEMBER";
            CredentialsInfo credentials = userService.createUserForFamilyMember(
                    saved, roleCode, request.getAccountPassword());
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

        // Ismni parse qilish (fullName bitta fieldda kelishi mumkin)
        String rawName = request.getFirstName().trim();
        String parsedFirstName = rawName;
        String parsedLastName = request.getLastName();
        if (rawName.contains(" ") && (parsedLastName == null || parsedLastName.isBlank())) {
            String[] parts = rawName.split("\\s+", 2);
            parsedFirstName = parts[0];
            parsedLastName = parts[1];
        }

        // Shajarada mavjud bo'lgan bog'lanmagan member'ni qidirish
        List<FamilyMember> candidates = familyMemberRepository
                .findUnlinkedMembersWithRelationships(parsedFirstName, request.getGender());

        if (!candidates.isEmpty()) {
            FamilyMember existing = candidates.get(0);
            existing.setUser(currentUser);
            if (parsedLastName != null)
                existing.setLastName(parsedLastName);
            if (request.getMiddleName() != null)
                existing.setMiddleName(request.getMiddleName());
            if (currentUser.getFamilyGroup() != null && existing.getFamilyGroup() == null) {
                existing.setFamilyGroup(currentUser.getFamilyGroup());
            }
            FamilyMember saved = familyMemberRepository.save(existing);
            currentUser.setFullName(saved.getDisplayName());
            userRepository.save(currentUser);
            log.info("User {} linked to existing member {} (auto-matched)", username, saved.getId());
            return toResponse(saved);
        }

        // Mavjud hech kim topilmasa — yangi yaratish
        FamilyRole role = request.getGender() == Gender.MALE ? FamilyRole.FATHER : FamilyRole.MOTHER;

        FamilyMember member = FamilyMember.builder()
                .firstName(parsedFirstName)
                .lastName(parsedLastName)
                .middleName(request.getMiddleName())
                .gender(request.getGender())
                .role(role)
                .user(currentUser)
                .familyGroup(currentUser.getFamilyGroup())
                .build();

        FamilyMember saved = familyMemberRepository.save(member);

        // User.fullName ni sinxronlashtirish
        currentUser.setFullName(saved.getDisplayName());
        userRepository.save(currentUser);

        return toResponse(saved);
    }

    @Transactional
    public FamilyMemberResponse update(Long id, FamilyMemberRequest request, CustomUserDetails currentUser) {
        FamilyMember member = findById(id);
        checkAccess(member, currentUser);

        member.setFirstName(request.getFirstName());
        member.setLastName(request.getLastName());
        member.setMiddleName(request.getMiddleName());
        // Role: agar null bo'lsa mavjud rolni saqlab qolish
        if (request.getRole() != null) {
            member.setRole(request.getRole());
        }
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
        }
        // userId yuborilmagan bo'lsa — mavjud bog'lanishni saqlab qolish

        FamilyMember saved = familyMemberRepository.save(member);

        // Bog'langan User.fullName ni sinxronlashtirish
        syncUserFullName(saved);

        // Akkaunt yaratish (update orqali ham)
        if (Boolean.TRUE.equals(request.getCreateAccount()) && saved.getUser() == null) {
            String roleCode = request.getAccountRole() != null && !request.getAccountRole().isBlank()
                    ? request.getAccountRole()
                    : "MEMBER";
            CredentialsInfo credentials = userService.createUserForFamilyMember(
                    saved, roleCode, request.getAccountPassword());
            User createdUser = userRepository.findByUsername(credentials.getUsername())
                    .orElseThrow(() -> new ResourceNotFoundException("Yaratilgan foydalanuvchi topilmadi"));
            saved.setUser(createdUser);
            familyMemberRepository.save(saved);
            return toResponse(saved, credentials);
        }

        return toResponse(saved);
    }

    @Transactional
    public FamilyMemberResponse updateSelf(UpdateSelfRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Foydalanuvchi topilmadi"));

        FamilyMember member = familyMemberRepository.findByUserId(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Siz hali oila a'zosiga bog'lanmagansiz"));

        // Faqat shaxsiy ma'lumotlarni yangilash
        member.setFirstName(request.getFirstName());
        member.setLastName(request.getLastName());
        member.setMiddleName(request.getMiddleName());
        member.setGender(request.getGender());
        member.setPhone(request.getPhone());
        member.setBirthDate(request.getBirthDate());
        member.setBirthPlace(request.getBirthPlace());
        member.setAvatar(request.getAvatar());
        // role, deathDate, userId — O'ZGARMAYDI

        FamilyMember saved = familyMemberRepository.save(member);

        // User ma'lumotlarini sinxronlashtirish
        currentUser.setFullName(saved.getDisplayName());
        currentUser.setPhone(request.getPhone());
        if (request.getEmail() != null) {
            currentUser.setEmail(request.getEmail());
        }
        userRepository.save(currentUser);

        return toResponse(saved);
    }

    @Transactional
    public void delete(Long id, CustomUserDetails currentUser) {
        FamilyMember member = findById(id);
        checkAccess(member, currentUser);

        // O'z-o'zini o'chirishdan himoya
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUserEntity = userRepository.findByUsername(username).orElse(null);
        if (currentUserEntity != null && member.getUser() != null
                && member.getUser().getId().equals(currentUserEntity.getId())) {
            throw new BadRequestException("O'zingizning profilingizni o'chirib bo'lmaydi");
        }

        member.setIsActive(false);
        familyMemberRepository.save(member);
    }

    @Transactional(readOnly = true)
    public List<FamilyMember> getAllEntities(CustomUserDetails currentUser) {
        Long familyGroupId = currentUser.getUser().getFamilyGroup() != null
                ? currentUser.getUser().getFamilyGroup().getId()
                : -1L;
        boolean isAdmin = currentUser.isAdmin();
        return familyMemberRepository.findAccessibleActiveMembers(familyGroupId, isAdmin);
    }

    private void checkAccess(FamilyMember member, CustomUserDetails currentUser) {
        if (currentUser.isAdmin())
            return;
        if (member.getFamilyGroup() == null)
            return;
        if (currentUser.getUser().getFamilyGroup() == null)
            return;

        if (!member.getFamilyGroup().getId().equals(currentUser.getUser().getFamilyGroup().getId())) {
            throw new AccessDeniedException(
                    "Siz ushbu oila a'zosini ko'rish yoki tahrirlash huquqiga ega emassiz.");
        }
    }

    /**
     * Bog'langan User.fullName ni FamilyMember dan sinxronlashtirish
     */
    private void syncUserFullName(FamilyMember member) {
        if (member.getUser() != null) {
            User linkedUser = member.getUser();
            linkedUser.setFullName(member.getDisplayName());
            userRepository.save(linkedUser);
        }
    }

    private void ensureSelfMemberActive() {
        try {
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            User currentUser = userRepository.findByUsername(username).orElse(null);
            if (currentUser == null)
                return;

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
        r.setFirstName(m.getFirstName());
        r.setLastName(m.getLastName());
        r.setMiddleName(m.getMiddleName());
        r.setFullName(m.getDisplayName());
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
