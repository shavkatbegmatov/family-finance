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

    @Transactional(readOnly = true)
    public PointConfigResponse getConfig() {
        Long groupId = getCurrentFamilyGroupId();
        PointConfig config = configRepository.findByFamilyGroupId(groupId)
                .orElse(null);
        if (config == null) {
            return getDefaultConfig(groupId);
        }
        return toResponse(config);
    }

    @Transactional
    public PointConfigResponse createOrUpdate(PointConfigRequest request) {
        CustomUserDetails userDetails = getCurrentUserDetails();
        Long groupId = userDetails.getUser().getFamilyGroup().getId();

        PointConfig config = configRepository.findByFamilyGroupId(groupId)
                .orElseGet(() -> {
                    PointConfig c = new PointConfig();
                    c.setFamilyGroup(userDetails.getUser().getFamilyGroup());
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
        Long groupId = getCurrentFamilyGroupId();
        return configRepository.findByFamilyGroupId(groupId).orElse(null);
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
        return getCurrentUserDetails().getUser().getFamilyGroup().getId();
    }

    public FamilyGroup getCurrentFamilyGroup() {
        return getCurrentUserDetails().getUser().getFamilyGroup();
    }

    public CustomUserDetails getCurrentUserDetails() {
        return (CustomUserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }
}
