package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.dto.request.SettingsUpdateRequest;
import uz.familyfinance.api.dto.response.SettingsResponse;
import uz.familyfinance.api.entity.AppSetting;
import uz.familyfinance.api.repository.AppSettingRepository;

@Service
@RequiredArgsConstructor
@Slf4j
public class SettingsService {

    public static final String DEBT_DUE_DAYS_KEY = "DEBT_DUE_DAYS";
    public static final int DEFAULT_DEBT_DUE_DAYS = 30;

    private final AppSettingRepository appSettingRepository;

    public SettingsResponse getSettings() {
        return SettingsResponse.builder()
                .debtDueDays(getDebtDueDays())
                .build();
    }

    public int getDebtDueDays() {
        return appSettingRepository.findBySettingKey(DEBT_DUE_DAYS_KEY)
                .map(AppSetting::getSettingValue)
                .map(this::parsePositiveInt)
                .orElse(DEFAULT_DEBT_DUE_DAYS);
    }

    @Transactional
    public SettingsResponse updateSettings(SettingsUpdateRequest request) {
        int debtDueDays = request.getDebtDueDays();

        AppSetting setting = appSettingRepository.findBySettingKey(DEBT_DUE_DAYS_KEY)
                .orElseGet(() -> AppSetting.builder()
                        .settingKey(DEBT_DUE_DAYS_KEY)
                        .description("Default debt due date in days")
                        .build());

        setting.setSettingValue(String.valueOf(debtDueDays));
        appSettingRepository.save(setting);

        return SettingsResponse.builder()
                .debtDueDays(debtDueDays)
                .build();
    }

    private int parsePositiveInt(String value) {
        try {
            int parsed = Integer.parseInt(value);
            return parsed > 0 ? parsed : DEFAULT_DEBT_DUE_DAYS;
        } catch (NumberFormatException ex) {
            log.warn("Invalid debt due days setting value: '{}'", value);
            return DEFAULT_DEBT_DUE_DAYS;
        }
    }
}
