package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import uz.familyfinance.api.entity.StoredFile;
import uz.familyfinance.api.exception.BadRequestException;
import uz.familyfinance.api.exception.ResourceNotFoundException;
import uz.familyfinance.api.repository.StoredFileRepository;

import java.io.IOException;
import java.util.Arrays;
import java.util.Optional;
import java.util.UUID;

/**
 * Rasm (avatar) fayllarini ilova ichida saqlash (G10 — ImgBB o'rniga).
 *
 * <p>Xavfsizlik: fayl turi mijoz yuborgan {@code Content-Type} bo'yicha emas, <b>magic-bytes</b>
 * bo'yicha aniqlanadi (JPEG/PNG/WebP), hajm {@value #MAX_AVATAR_BYTES} baytdan oshmaydi. Shu
 * sabab {@code GET /v1/files/{id}} hech qachon HTML/SVG kabi bajariladigan kontent qaytarmaydi
 * (stored XSS oldini olinadi); javobda {@code X-Content-Type-Options: nosniff} ham bor.</p>
 */
@Service
@RequiredArgsConstructor
public class FileStorageService {

    /** Avatar 512px JPEG ~50-150 KB; 2 MB — kesilmagan/PNG holatlar uchun zaxira bilan. */
    public static final long MAX_AVATAR_BYTES = 2L * 1024 * 1024;

    static final String IMAGE_JPEG = "image/jpeg";
    static final String IMAGE_PNG = "image/png";
    static final String IMAGE_WEBP = "image/webp";

    private static final byte[] JPEG_MAGIC = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};
    private static final byte[] PNG_MAGIC = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A};
    private static final byte[] RIFF_MAGIC = {'R', 'I', 'F', 'F'};
    private static final byte[] WEBP_MAGIC = {'W', 'E', 'B', 'P'};
    private static final int WEBP_TAG_OFFSET = 8;
    private static final String FILES_PATH = "/v1/files/{publicId}";

    private final StoredFileRepository storedFileRepository;

    /** Yuklangan avatar'ni tekshirib saqlaydi; {@link BadRequestException} — tur/hajm noto'g'ri. */
    @Transactional
    public StoredFile storeAvatar(MultipartFile file, Long uploaderId) {
        byte[] bytes = readBytes(file);
        String contentType = validateAvatar(bytes);
        StoredFile stored = StoredFile.builder()
                .publicId(UUID.randomUUID())
                .contentType(contentType)
                .sizeBytes(bytes.length)
                .data(bytes)
                .uploadedBy(uploaderId)
                .build();
        return storedFileRepository.save(stored);
    }

    @Transactional(readOnly = true)
    public StoredFile getByPublicId(UUID publicId) {
        return storedFileRepository.findByPublicId(publicId)
                .orElseThrow(() -> new ResourceNotFoundException("Fayl topilmadi: " + publicId));
    }

    /**
     * Joriy so'rov asosida absolyut ochiq URL (prod'da Traefik ortida
     * {@code server.forward-headers-strategy=framework} tufayli https + haqiqiy host).
     */
    public String publicUrl(UUID publicId) {
        return ServletUriComponentsBuilder.fromCurrentContextPath()
                .path(FILES_PATH)
                .buildAndExpand(publicId)
                .toUriString();
    }

    /** Hajm + magic-bytes tekshiruvi; aniqlangan MIME turini qaytaradi. */
    static String validateAvatar(byte[] bytes) {
        if (bytes == null || bytes.length == 0) {
            throw new BadRequestException("Rasm fayli bo'sh");
        }
        if (bytes.length > MAX_AVATAR_BYTES) {
            throw new BadRequestException("Rasm hajmi 2 MB dan oshmasligi kerak");
        }
        return detectImageType(bytes)
                .orElseThrow(() -> new BadRequestException("Faqat JPEG, PNG yoki WebP rasm qabul qilinadi"));
    }

    /** Magic-bytes bo'yicha rasm turi; qo'llanmaydigan/buzuq fayl uchun bo'sh. */
    static Optional<String> detectImageType(byte[] bytes) {
        if (startsWith(bytes, JPEG_MAGIC, 0)) {
            return Optional.of(IMAGE_JPEG);
        }
        if (startsWith(bytes, PNG_MAGIC, 0)) {
            return Optional.of(IMAGE_PNG);
        }
        if (startsWith(bytes, RIFF_MAGIC, 0) && startsWith(bytes, WEBP_MAGIC, WEBP_TAG_OFFSET)) {
            return Optional.of(IMAGE_WEBP);
        }
        return Optional.empty();
    }

    private static boolean startsWith(byte[] bytes, byte[] magic, int offset) {
        if (bytes.length < offset + magic.length) {
            return false;
        }
        return Arrays.equals(bytes, offset, offset + magic.length, magic, 0, magic.length);
    }

    private static byte[] readBytes(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Rasm fayli bo'sh");
        }
        try {
            return file.getBytes();
        } catch (IOException e) {
            throw new BadRequestException("Rasm faylini o'qib bo'lmadi");
        }
    }
}
