package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.dto.request.SwitchScopeRequest;
import uz.familyfinance.api.dto.response.SwitchScopeResponse;
import uz.familyfinance.api.entity.Scope;
import uz.familyfinance.api.entity.User;
import uz.familyfinance.api.enums.MembershipStatus;
import uz.familyfinance.api.enums.ScopeRole;
import uz.familyfinance.api.exception.ResourceNotFoundException;
import uz.familyfinance.api.repository.ScopeMembershipRepository;
import uz.familyfinance.api.repository.ScopeRepository;
import uz.familyfinance.api.repository.UserRepository;
import uz.familyfinance.api.security.JwtTokenProvider;

import java.util.Optional;

/**
 * Aktiv scope'ni o'zgartirish — yangi JWT token chiqaradi.
 *
 * <p>Validatsiyalar:</p>
 * <ul>
 *   <li>Maqsadli scope mavjud va aktiv</li>
 *   <li>User'da shu scope'da ACTIVE membership bor (yoki SUPER_ADMIN)</li>
 * </ul>
 *
 * <p>Agar {@code persistAsPrimary = true} bo'lsa, User.primaryScope ham yangilanadi
 * (kelgusi login'larda default sifatida shu scope qoladi).</p>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ScopeSwitchService {

    private final ScopeRepository scopeRepository;
    private final ScopeMembershipRepository membershipRepository;
    private final UserRepository userRepository;
    private final ScopeContextService scopeContext;
    private final JwtTokenProvider jwtTokenProvider;

    @Transactional
    public SwitchScopeResponse switchScope(SwitchScopeRequest request) {
        Scope target = scopeRepository.findById(request.getScopeId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Scope topilmadi: id=" + request.getScopeId()));

        if (!Boolean.TRUE.equals(target.getIsActive())) {
            throw new AccessDeniedException("Bu scope nofaol holatda");
        }

        User currentUser = scopeContext.getCurrentUser();
        boolean isSuperAdmin = scopeContext.isSuperAdmin();

        // Membership tekshiruvi (SUPER_ADMIN bo'lsa hammasiga ruxsat)
        Optional<ScopeRole> userRole = membershipRepository.findActiveRole(
                target.getId(), currentUser.getId());

        if (!isSuperAdmin && userRole.isEmpty()) {
            throw new AccessDeniedException(
                    "Sizda bu scope'ga kirish ruxsati yo'q (membership mavjud emas)");
        }

        // Yangi JWT token yaratish (yangi activeScopeId bilan)
        String newToken = jwtTokenProvider.generateStaffTokenWithPermissions(
                currentUser.getUsername(),
                currentUser.getId(),
                scopeContext.getCurrentUserDetails().getRoleCodes(),
                scopeContext.getCurrentUserDetails().getPermissions(),
                target.getId()
        );

        // Ixtiyoriy: User.primaryScope ni ham yangilash (default sifatida)
        if (Boolean.TRUE.equals(request.getPersistAsPrimary())) {
            currentUser.setPrimaryScope(target);
            userRepository.save(currentUser);
            log.info("User {} primary scope updated to {}", currentUser.getUsername(), target.getId());
        }

        log.info("User {} switched active scope to {} ({})",
                currentUser.getUsername(), target.getId(), target.getName());

        return SwitchScopeResponse.builder()
                .accessToken(newToken)
                .tokenType("Bearer")
                .activeScopeId(target.getId())
                .activeScopeName(target.getName())
                .activeScopeType(target.getType())
                .currentUserRole(isSuperAdmin && userRole.isEmpty() ? null : userRole.orElse(null))
                .build();
    }
}
