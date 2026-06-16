package uz.familyfinance.api.util;

import lombok.Builder;
import lombok.Data;
import org.springframework.stereotype.Component;

@Component
public class UserAgentParser {

    public DeviceInfo parse(String userAgent) {
        if (userAgent == null || userAgent.isBlank()) {
            return DeviceInfo.builder()
                    .deviceType("Unknown")
                    .browser("Unknown")
                    .os("Unknown")
                    .build();
        }

        String deviceType = detectDeviceType(userAgent);
        String browser = detectBrowser(userAgent);
        String os = detectOS(userAgent);

        return DeviceInfo.builder()
                .deviceType(deviceType)
                .browser(browser)
                .os(os)
                .build();
    }

    private String detectDeviceType(String ua) {
        if (ua.contains("Mobile") || ua.contains("Android")) return "Mobile";
        if (ua.contains("Tablet") || ua.contains("iPad")) return "Tablet";
        return "Desktop";
    }

    private String detectBrowser(String ua) {
        // Maxsus belgilar umumiydan OLDIN: Edge ("Edg/") va Opera ("OPR/") UA'sida "Chrome/" ham bor.
        if (ua.contains("Edg/")) return "Edge";
        if (ua.contains("OPR/") || ua.contains("Opera")) return "Opera";
        if (ua.contains("Chrome/")) return "Chrome";
        if (ua.contains("Safari/") && !ua.contains("Chrome")) return "Safari";
        if (ua.contains("Firefox/")) return "Firefox";
        return "Unknown";
    }

    private String detectOS(String ua) {
        // Mobil OS'lar AVVAL: Android UA'sida "Linux", iPhone/iPad UA'sida "Mac OS X" uchraydi —
        // umumiy belgilar oldinda bo'lsa Android "Linux", iPhone "MacOS" deb noto'g'ri aniqlanardi.
        if (ua.contains("Android")) return "Android";
        if (ua.contains("iPhone") || ua.contains("iPad")) return "iOS";
        if (ua.contains("Windows")) return "Windows";
        if (ua.contains("Mac OS")) return "MacOS";
        if (ua.contains("Linux")) return "Linux";
        return "Unknown";
    }

    @Data
    @Builder
    public static class DeviceInfo {
        private String deviceType;
        private String browser;
        private String os;
    }
}
