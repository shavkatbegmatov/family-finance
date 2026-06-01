package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.entity.Scope;
import uz.familyfinance.api.entity.ScopeMembership;
import uz.familyfinance.api.entity.User;
import uz.familyfinance.api.enums.MembershipStatus;
import uz.familyfinance.api.enums.ScopeRole;
import uz.familyfinance.api.repository.ScopeMembershipRepository;

import java.time.LocalDateTime;

/**
 * Scope a'zoligini (ScopeMembership) yaratish/qayta tiklash uchun markazlashtirilgan servis.
 *
 * <p>Bir nechta servis (AuthService — invite orqali qo'shilish, UserService — oila a'zosiga
 * login ochish) bir xil "agar membership yo'q bo'lsa yaratish, INACTIVE bo'lsa qayta faollashtirish"
 * mantig'iga muhtoj edi. DRY uchun shu yerga jamlangan.</p>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ScopeMembershipService {

    private final ScopeMembershipRepository scopeMembershipRepository;

    /**
     * User'ni berilgan scope'ga {@code role} bilan a'zo qiladi.
     * <ul>
     *   <li>Membership yo'q bo'lsa — yangi ACTIVE membership yaratadi.</li>
     *   <li>INACTIVE/PENDING membership bo'lsa — ACTIVE'ga o'tkazib, rolni yangilaydi.</li>
     *   <li>Allaqachon ACTIVE bo'lsa — tegmaydi (rolni majburan o'zgartirmaydi).</li>
     * </ul>
     *
     * @param scope a'zo qilinadigan scope; {@code null} bo'lsa hech narsa qilinmaydi (xavfsiz no-op)
     * @param user  a'zo qilinadigan foydalanuvchi
     * @param role  beriladigan rol
     */
    @Transactional
    public void addMembershipIfAbsent(Scope scope, User user, ScopeRole role) {
        if (scope == null || user == null) {
            return;
        }
        scopeMembershipRepository.findByScopeIdAndUserId(scope.getId(), user.getId())
                .ifPresentOrElse(existing -> {
                    if (existing.getStatus() != MembershipStatus.ACTIVE) {
                        existing.setStatus(MembershipStatus.ACTIVE);
                        existing.setRole(role);
                        scopeMembershipRepository.save(existing);
                    }
                }, () -> scopeMembershipRepository.save(ScopeMembership.builder()
                        .scope(scope)
                        .user(user)
                        .role(role)
                        .status(MembershipStatus.ACTIVE)
                        .joinedAt(LocalDateTime.now())
                        .build()));
    }

    /**
     * User'ni HOUSEHOLD va uning parent CLAN'iga bir xil rol bilan a'zo qiladi.
     * Xonadon a'zosiga login berishda ham, eski login'larni tuzatishda ham ishlatiladi (DRY).
     *
     * @param household HOUSEHOLD scope; {@code null} bo'lsa no-op
     */
    @Transactional
    public void attachToHousehold(Scope household, User user, ScopeRole role) {
        if (household == null) {
            return;
        }
        // Avval parent CLAN (genealogiya/ko'rinish), keyin HOUSEHOLD (byudjet) — ikkalasi bir xil rol
        addMembershipIfAbsent(household.getParentScope(), user, role);
        addMembershipIfAbsent(household, user, role);
    }
}
