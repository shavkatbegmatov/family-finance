package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.dto.request.MembershipInviteRequest;
import uz.familyfinance.api.dto.request.ScopeRoleUpdateRequest;
import uz.familyfinance.api.dto.response.MembershipResponse;
import uz.familyfinance.api.entity.Scope;
import uz.familyfinance.api.entity.ScopeMembership;
import uz.familyfinance.api.entity.User;
import uz.familyfinance.api.enums.MembershipStatus;
import uz.familyfinance.api.enums.ScopeRole;
import uz.familyfinance.api.exception.BadRequestException;
import uz.familyfinance.api.exception.ConflictException;
import uz.familyfinance.api.exception.ResourceNotFoundException;
import uz.familyfinance.api.repository.ScopeMembershipRepository;
import uz.familyfinance.api.repository.ScopeRepository;
import uz.familyfinance.api.repository.UserRepository;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Scope membership boshqaruvi: taklif, rol o'zgartirish, chiqarib yuborish.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MembershipService {

    private final ScopeMembershipRepository membershipRepository;
    private final ScopeRepository scopeRepository;
    private final UserRepository userRepository;
    private final ScopeContextService scopeContext;

    // ====================================================================
    // Read
    // ====================================================================

    @Transactional(readOnly = true)
    public List<MembershipResponse> listForScope(Long scopeId) {
        if (!scopeContext.canViewScope(scopeId)) {
            throw new AccessDeniedException("Sizda bu scope a'zolarini ko'rish ruxsati yo'q");
        }
        return membershipRepository.findByScopeIdAndStatus(scopeId, MembershipStatus.ACTIVE)
                .stream()
                .map(MembershipResponse::from)
                .collect(Collectors.toList());
    }

    // ====================================================================
    // Invite
    // ====================================================================

    @Transactional
    public MembershipResponse invite(Long scopeId, MembershipInviteRequest request) {
        Scope scope = scopeRepository.findById(scopeId)
                .orElseThrow(() -> new ResourceNotFoundException("Scope topilmadi: id=" + scopeId));

        if (!scopeContext.canManageScope(scopeId)) {
            throw new AccessDeniedException("Sizda bu scope'ga a'zo qo'shish ruxsati yo'q");
        }

        User targetUser = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Foydalanuvchi topilmadi"));

        // Mavjud ACTIVE membership tekshiruvi
        membershipRepository.findByScopeIdAndUserId(scopeId, targetUser.getId())
                .ifPresent(existing -> {
                    if (existing.getStatus() == MembershipStatus.ACTIVE) {
                        throw new ConflictException("Foydalanuvchi allaqachon bu scope a'zosi");
                    }
                    // Agar LEFT/EXPELLED bo'lsa, qayta tiklash mumkin
                    existing.setStatus(MembershipStatus.ACTIVE);
                    existing.setRole(request.getRole());
                    existing.setInvitedBy(scopeContext.getCurrentUser());
                    membershipRepository.save(existing);
                });

        // Yangi membership
        ScopeMembership membership = ScopeMembership.builder()
                .scope(scope)
                .user(targetUser)
                .role(request.getRole())
                .status(MembershipStatus.ACTIVE)
                .invitedBy(scopeContext.getCurrentUser())
                .build();
        membership = membershipRepository.save(membership);

        log.info("Membership created: scope={}, user={}, role={}, invitedBy={}",
                scopeId, targetUser.getUsername(), request.getRole(),
                scopeContext.getCurrentUserId());

        return MembershipResponse.from(membership);
    }

    // ====================================================================
    // Update role
    // ====================================================================

    @Transactional
    public MembershipResponse updateRole(Long scopeId, Long userId, ScopeRoleUpdateRequest request) {
        if (!scopeContext.canManageScope(scopeId)) {
            throw new AccessDeniedException("Sizda rollarni o'zgartirish ruxsati yo'q");
        }

        ScopeMembership membership = membershipRepository.findByScopeIdAndUserId(scopeId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Membership topilmadi"));

        if (membership.getStatus() != MembershipStatus.ACTIVE) {
            throw new BadRequestException("Faqat ACTIVE membership rolini o'zgartirish mumkin");
        }

        ScopeRole oldRole = membership.getRole();
        membership.setRole(request.getRole());
        membership = membershipRepository.save(membership);

        // Agar OWNER'dan kichik rolga tushirilayotgan bo'lsa, kamida 1 OWNER qoldiq tekshiruvi
        if (oldRole == ScopeRole.OWNER && request.getRole() != ScopeRole.OWNER) {
            long ownersLeft = membershipRepository.findByScopeIdAndRole(scopeId, ScopeRole.OWNER).size();
            if (ownersLeft == 0) {
                throw new ConflictException("Kamida 1 OWNER qolishi kerak");
            }
        }

        log.info("Membership role changed: scope={}, user={}, from {} to {}",
                scopeId, userId, oldRole, request.getRole());

        return MembershipResponse.from(membership);
    }

    // ====================================================================
    // Remove
    // ====================================================================

    @Transactional
    public void remove(Long scopeId, Long userId) {
        if (!scopeContext.canManageScope(scopeId)) {
            throw new AccessDeniedException("Sizda a'zolarni chiqarib yuborish ruxsati yo'q");
        }

        ScopeMembership membership = membershipRepository.findByScopeIdAndUserId(scopeId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Membership topilmadi"));

        // Oxirgi OWNER'ni o'chirib bo'lmaydi
        if (membership.getRole() == ScopeRole.OWNER) {
            long ownerCount = membershipRepository.findByScopeIdAndRole(scopeId, ScopeRole.OWNER).size();
            if (ownerCount <= 1) {
                throw new ConflictException("Oxirgi OWNER'ni chiqarib bo'lmaydi");
            }
        }

        membership.setStatus(MembershipStatus.EXPELLED);
        membershipRepository.save(membership);

        log.info("Membership removed (EXPELLED): scope={}, user={}, by={}",
                scopeId, userId, scopeContext.getCurrentUserId());
    }
}
