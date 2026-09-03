package uz.familyfinance.api.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import uz.familyfinance.api.exception.BadRequestException;

import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * {@link FileStorageService} ning toza-mantiq qismi: magic-bytes bo'yicha tur aniqlash va
 * avatar validatsiyasi. JPA/HTTP qatlami integratsiya/manual bilan tekshiriladi.
 */
@DisplayName("FileStorageService")
class FileStorageServiceTest {

    private static byte[] withPrefix(byte[] prefix, int totalLength) {
        byte[] bytes = new byte[totalLength];
        System.arraycopy(prefix, 0, bytes, 0, prefix.length);
        return bytes;
    }

    private static final byte[] JPEG = withPrefix(new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0}, 64);
    private static final byte[] PNG = withPrefix(new byte[]{(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A}, 64);
    private static final byte[] WEBP = withPrefix(new byte[]{'R', 'I', 'F', 'F', 0, 0, 0, 0, 'W', 'E', 'B', 'P'}, 64);

    @Nested
    @DisplayName("detectImageType")
    class DetectImageType {

        @Test
        @DisplayName("JPEG, PNG, WebP magic-bytes'lari to'g'ri aniqlanadi")
        void knownTypes() {
            assertThat(FileStorageService.detectImageType(JPEG)).contains("image/jpeg");
            assertThat(FileStorageService.detectImageType(PNG)).contains("image/png");
            assertThat(FileStorageService.detectImageType(WEBP)).contains("image/webp");
        }

        @Test
        @DisplayName("HTML/SVG/matn/GIF — qo'llanmaydi (stored XSS himoyasi)")
        void unsupportedTypes() {
            assertThat(FileStorageService.detectImageType("<html><script>".getBytes())).isEmpty();
            assertThat(FileStorageService.detectImageType("<svg xmlns=".getBytes())).isEmpty();
            assertThat(FileStorageService.detectImageType("GIF89a".getBytes())).isEmpty();
            assertThat(FileStorageService.detectImageType(new byte[0])).isEmpty();
        }

        @Test
        @DisplayName("RIFF bo'lib WEBP bo'lmasa (masalan WAV) — qo'llanmaydi")
        void riffButNotWebp() {
            byte[] wav = withPrefix(new byte[]{'R', 'I', 'F', 'F', 0, 0, 0, 0, 'W', 'A', 'V', 'E'}, 64);
            assertThat(FileStorageService.detectImageType(wav)).isEmpty();
        }

        @Test
        @DisplayName("magic uzunligidan qisqa fayl — xatosiz, qo'llanmaydi")
        void tooShort() {
            assertThat(FileStorageService.detectImageType(new byte[]{(byte) 0xFF})).isEmpty();
        }
    }

    @Nested
    @DisplayName("validateAvatar")
    class ValidateAvatar {

        @Test
        @DisplayName("yaroqli JPEG — aniqlangan tur qaytadi")
        void validJpeg() {
            assertThat(FileStorageService.validateAvatar(JPEG)).isEqualTo("image/jpeg");
        }

        @Test
        @DisplayName("bo'sh fayl → 400")
        void empty() {
            assertThatThrownBy(() -> FileStorageService.validateAvatar(new byte[0]))
                    .isInstanceOf(BadRequestException.class);
            assertThatThrownBy(() -> FileStorageService.validateAvatar(null))
                    .isInstanceOf(BadRequestException.class);
        }

        @Test
        @DisplayName("2 MB dan katta → 400 (tur tekshiruvidan oldin)")
        void tooLarge() {
            byte[] huge = new byte[(int) FileStorageService.MAX_AVATAR_BYTES + 1];
            Arrays.fill(huge, (byte) 0xFF);
            assertThatThrownBy(() -> FileStorageService.validateAvatar(huge))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("2 MB");
        }

        @Test
        @DisplayName("qo'llanmaydigan tur → 400")
        void unsupported() {
            assertThatThrownBy(() -> FileStorageService.validateAvatar("<html>".getBytes()))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("JPEG");
        }
    }
}
