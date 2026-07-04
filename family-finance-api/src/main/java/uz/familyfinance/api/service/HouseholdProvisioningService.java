package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.entity.Scope;
import uz.familyfinance.api.entity.User;
import uz.familyfinance.api.enums.ScopeRole;
import uz.familyfinance.api.enums.ScopeType;
import uz.familyfinance.api.repository.ScopeRepository;
import uz.familyfinance.api.util.HouseholdCodeGenerator;
import uz.familyfinance.api.util.InviteCodeGenerator;

/**
 * Mavjud GROUP (urug') ostida yangi HOUSEHOLD (xonadon) scope yaratish uchun markazlashtirilgan servis.
 *
 * <p>Har bir yangi oila (FamilyUnit/nikoh) o'zining alohida xonadon raqamiga ({@code displayCode})
 * ega bo'lishi uchun ishlatiladi — aks holda bir aktiv xonadonda yaratilgan barcha oilalar bir xil
 * raqamni baham ko'radi.</p>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class HouseholdProvisioningService {

    private final ScopeRepository scopeRepository;
    private final InviteCodeGenerator inviteCodeGenerator;
    private final HouseholdCodeGenerator householdCodeGenerator;
    private final ScopeMembershipService scopeMembershipService;

    /**
     * Berilgan GROUP ostida yangi HOUSEHOLD scope yaratadi (unique invite kod + inson o'qiy
     * oladigan {@code displayCode} bilan) va egasini OWNER sifatida a'zo qiladi.
     *
     * @param clan  ota GROUP scope (null bo'lsa parent'siz — eski/g'ayrioddiy holat)
     * @param name  xonadon nomi (UI'da ko'rsatish uchun)
     * @param owner xonadon egasi (OWNER membership oladi)
     * @return saqlangan HOUSEHOLD scope
     */
    @Transactional
    public Scope createHousehold(Scope clan, String name, User owner) {
        Scope household = Scope.builder()
                .type(ScopeType.HOUSEHOLD)
                .name(name)
                .parentScope(clan)
                .ownerUser(owner)
                .uniqueCode(inviteCodeGenerator.generateForType(ScopeType.HOUSEHOLD))
                .displayCode(householdCodeGenerator.generate())
                .legacyFamilyGroup(clan != null ? clan.getLegacyFamilyGroup() : null)
                .isActive(true)
                .build();
        household = scopeRepository.save(household);

        scopeMembershipService.addMembershipIfAbsent(household, owner, ScopeRole.OWNER);

        log.info("Yangi xonadon yaratildi: id={}, displayCode={}, owner={}",
                household.getId(), household.getDisplayCode(),
                owner != null ? owner.getUsername() : null);
        return household;
    }
}
