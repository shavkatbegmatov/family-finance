package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.dto.request.PointConfigRequest;
import uz.familyfinance.api.dto.response.PointConfigResponse;
import uz.familyfinance.api.entity.FamilyGroup;
import uz.familyfinance.api.entity.PointConfig;
import uz.familyfinance.api.exception.ResourceNotFoundException;
import uz.familyfinance.api.repository.PointConfigRepository;
import uz.familyfinance.api.security.CustomUserDetails;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
@Slf4j
public class PointConfigService {

    private final PointConfigRepository configRepository;
    private final ScopeContextService scopeContext;

    @Transactional(readOnly = true)
    public PointConfigResponse getConfig() {
        PointConfig config = configRepository.findByScopeId(getActiveHouseholdScopeId())
                .orElse(null);
        if (config == null) {
            return getDefaultConfig(getCurrentFamilyGroupId());
        }
        return toResponse(config);
    }

    @Transactional
    public PointConfigResponse createOrUpdate(PointConfigRequest request) {
        CustomUserDetails userDetails = getCurrentUserDetails();

        // ADR-002 P1b: hamyon konteksti — yagona kalit; familyGroup dual-write (P1c'da olib tashlanadi)
        PointConfig config = configRepository.findByScopeId(getActiveHouseholdScopeId())
                .orElseGet(() -> {
                    PointConfig c = new PointConfig();
                    c.setFamilyGroup(userDetails.getUser().getFamilyGroup());
                    c.setScope(getActiveHouseholdScope());
                    return c;
                });

        config.setConversionRate(request.getConversionRate());
        if (request.getCurrency() != null) config.setCurrency(request.getCurrency());
        if (request.getInflationEnabled() != null) config.setInflationEnabled(request.getInflationEnabled());
        if (request.getInflationRateMonthly() != null) config.setInflationRateMonthly(request.getInflationRateMonthly());
        if (request.getSavingsInterestRate() != null) config.setSavingsInterestRate(request.getSavingsInterestRate());
        if (request.getStreakBonusEnabled() != null) config.setStreakBonusEnabled(request.getStreakBonusEnabled());
        if (request.getStreakBonusPercentage() != null) config.setStreakBonusPercentage(request.getStreakBonusPercentage());
        config.setMaxDailyPoints(request.getMaxDailyPoints());
        config.setAutoApproveBelow(request.getAutoApproveBelow());

        return toResponse(configRepository.save(config));
    }

    public PointConfig getConfigEntity() {
        return configRepository.findByScopeId(getActiveHouseholdScopeId()).orElse(null);
    }

    public BigDecimal getConversionRate() {
        PointConfig config = getConfigEntity();
        return config != null ? config.getConversionRate() : BigDecimal.valueOf(100);
    }

    private PointConfigResponse getDefaultConfig(Long groupId) {
        PointConfigResponse r = new PointConfigResponse();
        r.setFamilyGroupId(groupId);
        r.setConversionRate(BigDecimal.valueOf(100));
        r.setCurrency("UZS");
        r.setInflationEnabled(false);
        r.setInflationRateMonthly(BigDecimal.ZERO);
        r.setSavingsInterestRate(BigDecimal.valueOf(0.05));
        r.setStreakBonusEnabled(true);
        r.setStreakBonusPercentage(BigDecimal.valueOf(0.1));
        r.setIsActive(true);
        return r;
    }

    private PointConfigResponse toResponse(PointConfig c) {
        PointConfigResponse r = new PointConfigResponse();
        r.setId(c.getId());
        r.setFamilyGroupId(c.getFamilyGroup().getId());
        r.setConversionRate(c.getConversionRate());
        r.setCurrency(c.getCurrency());
        r.setInflationEnabled(c.getInflationEnabled());
        r.setInflationRateMonthly(c.getInflationRateMonthly());
        r.setSavingsInterestRate(c.getSavingsInterestRate());
        r.setStreakBonusEnabled(c.getStreakBonusEnabled());
        r.setStreakBonusPercentage(c.getStreakBonusPercentage());
        r.setMaxDailyPoints(c.getMaxDailyPoints());
        r.setAutoApproveBelow(c.getAutoApproveBelow());
        r.setIsActive(c.getIsActive());
        r.setCreatedAt(c.getCreatedAt());
        return r;
    }

    public Long getCurrentFamilyGroupId() {
        return getCurrentFamilyGroup().getId();
    }

    /**
     * ADR-002 P1: joriy aktiv xonadon scope'i — Points yozuvlarining hamyon konteksti.
     * Barcha Point* servislar dual-write davrida shu yagona manbadan oladi.
     */
    public uz.familyfinance.api.entity.Scope getActiveHouseholdScope() {
        return scopeContext.getActiveHousehold().orElse(null);
    }

    /**
     * ADR-002 P1b: hamyon konteksti ID'si — Points o'qishlarining yagona kaliti
     * (eski {@link #getCurrentFamilyGroupId()} o'rnini bosadi). Aktiv xonadon
     * topilmasa aniq xato — Points faqat xonadon kontekstida ma'noli.
     */
    public Long getActiveHouseholdScopeId() {
        uz.familyfinance.api.entity.Scope household = getActiveHouseholdScope();
        if (household == null) {
            throw new ResourceNotFoundException(
                    "Aktiv xonadon topilmadi — Ballar tizimi xonadon kontekstida ishlaydi");
        }
        return household.getId();
    }

    /**
     * JWT'dagi activeScopeId orqali aktiv scope'ga mos genealogik tenant'ni (FamilyGroup)
     * qaytaradi. Bu mavjud 31+ chaqiruvchini qayta yozmasdan scope-aware bo'lish imkonini
     * beradi. ADR-001 F5: mapping legacy FK emas — scope EGASINING familyGroup'i orqali
     * ({@code ScopeContextService.resolveFamilyGroup}).
     *
     * <p>Eski fallback: agar aktiv scope topilmasa (legacy token), User.familyGroup
     * dan o'qiladi — eski Phase 1 oldidagi xulq-atvor.</p>
     */
    public FamilyGroup getCurrentFamilyGroup() {
        return scopeContext.getActiveFamilyGroupOptional()
                .orElseGet(() -> {
                    FamilyGroup group = getCurrentUserDetails().getUser().getFamilyGroup();
                    if (group == null) {
                        throw new ResourceNotFoundException(
                                "Siz biron bir Oila guruhiga a'zo emassiz");
                    }
                    return group;
                });
    }

    public CustomUserDetails getCurrentUserDetails() {
        return (CustomUserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    /** Phase 2: ScopeContext'ni bog'liq Points servislariga ochish (DI shorthand). */
    public ScopeContextService getScopeContext() {
        return scopeContext;
    }
}
