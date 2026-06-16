package uz.familyfinance.api.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * {@link UserAgentParser} — User-Agent satridan qurilma/brauzer/OS aniqlash testlari.
 *
 * Bog'liqliksiz toza komponent ({@code new UserAgentParser()}). Testlar amaldagi xatti-harakatni
 * qulflaydi — jumladan ma'lum chekkalar (Android UA "Linux" deb belgilanadi, chunki
 * {@code detectOS} Linux'ni Android'dan oldin tekshiradi). Bu ataylab — kod o'zgartirilmagan,
 * faqat regressiya ushlanadi.
 */
@DisplayName("UserAgentParser")
class UserAgentParserTest {

    private final UserAgentParser parser = new UserAgentParser();

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   "})
    @DisplayName("null/bo'sh/probel UA -> hammasi Unknown")
    void unknownForBlankUserAgent(String ua) {
        UserAgentParser.DeviceInfo info = parser.parse(ua);
        assertThat(info.getDeviceType()).isEqualTo("Unknown");
        assertThat(info.getBrowser()).isEqualTo("Unknown");
        assertThat(info.getOs()).isEqualTo("Unknown");
    }

    @Test
    @DisplayName("Windows desktop Chrome")
    void detectsChromeOnWindows() {
        String ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                + "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
        UserAgentParser.DeviceInfo info = parser.parse(ua);

        assertThat(info.getDeviceType()).isEqualTo("Desktop");
        assertThat(info.getBrowser()).isEqualTo("Chrome");
        assertThat(info.getOs()).isEqualTo("Windows");
    }

    @Test
    @DisplayName("Edge'da 'Edg/' Chrome'dan ustun aniqlanadi")
    void detectsEdgeBeforeChrome() {
        String ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                + "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0";
        assertThat(parser.parse(ua).getBrowser()).isEqualTo("Edge");
    }

    @Test
    @DisplayName("macOS desktop Safari (Chrome'siz)")
    void detectsSafariOnMac() {
        String ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 "
                + "(KHTML, like Gecko) Version/17.0 Safari/605.1.15";
        UserAgentParser.DeviceInfo info = parser.parse(ua);

        assertThat(info.getDeviceType()).isEqualTo("Desktop");
        assertThat(info.getBrowser()).isEqualTo("Safari");
        assertThat(info.getOs()).isEqualTo("MacOS");
    }

    @Test
    @DisplayName("Linux desktop Firefox")
    void detectsFirefoxOnLinux() {
        String ua = "Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0";
        UserAgentParser.DeviceInfo info = parser.parse(ua);

        assertThat(info.getDeviceType()).isEqualTo("Desktop");
        assertThat(info.getBrowser()).isEqualTo("Firefox");
        assertThat(info.getOs()).isEqualTo("Linux");
    }

    @Test
    @DisplayName("Android mobil: deviceType=Mobile, browser=Chrome, os=Linux (amaldagi chekka)")
    void detectsAndroidMobile() {
        String ua = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 "
                + "(KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
        UserAgentParser.DeviceInfo info = parser.parse(ua);

        assertThat(info.getDeviceType()).isEqualTo("Mobile");
        assertThat(info.getBrowser()).isEqualTo("Chrome");
        // detectOS Linux'ni Android'dan oldin tekshiradi -> "Linux" (amaldagi xatti-harakat)
        assertThat(info.getOs()).isEqualTo("Linux");
    }

    @Test
    @DisplayName("noma'lum brauzer/OS uchun Unknown qaytaradi")
    void unknownForUnrecognizedTokens() {
        UserAgentParser.DeviceInfo info = parser.parse("SomeRandomBot/1.0");
        assertThat(info.getBrowser()).isEqualTo("Unknown");
        assertThat(info.getOs()).isEqualTo("Unknown");
        assertThat(info.getDeviceType()).isEqualTo("Desktop"); // mobil belgilar yo'q -> Desktop
    }
}
