package uz.familyfinance.api.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * AES-256-GCM orqali karta raqamlarini shifrlash/deshifrlash xizmati.
 */
@Service
@Slf4j
public class CardEncryptionService {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_TAG_LENGTH = 128;
    private static final int IV_LENGTH = 12;

    private final SecretKeySpec secretKey;

    public CardEncryptionService(@Value("${app.card-encryption.key:default-key-change-in-production-32ch}") String key) {
        byte[] keyBytes = key.getBytes(StandardCharsets.UTF_8);
        if (keyBytes.length < 32) {
            byte[] paddedKey = new byte[32];
            System.arraycopy(keyBytes, 0, paddedKey, 0, Math.min(keyBytes.length, 32));
            keyBytes = paddedKey;
        } else if (keyBytes.length > 32) {
            byte[] trimmedKey = new byte[32];
            System.arraycopy(keyBytes, 0, trimmedKey, 0, 32);
            keyBytes = trimmedKey;
        }
        this.secretKey = new SecretKeySpec(keyBytes, "AES");
    }

    /**
     * Karta raqamini AES-256-GCM bilan shifrlaydi.
     *
     * @param plainText shifrlash kerak bo'lgan matn (karta raqami)
     * @return Base64 kodlangan shifrlangan matn (IV + ciphertext)
     */
    public String encrypt(String plainText) {
        try {
            byte[] iv = new byte[IV_LENGTH];
            new SecureRandom().nextBytes(iv);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec gcmSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, gcmSpec);

            byte[] cipherText = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));

            // IV + ciphertext ni birlashtirish
            byte[] combined = new byte[IV_LENGTH + cipherText.length];
            System.arraycopy(iv, 0, combined, 0, IV_LENGTH);
            System.arraycopy(cipherText, 0, combined, IV_LENGTH, cipherText.length);

            return Base64.getEncoder().encodeToString(combined);
        } catch (Exception e) {
            log.error("Shifrlash xatosi", e);
            throw new RuntimeException("Karta raqamini shifrlashda xatolik yuz berdi", e);
        }
    }

    /**
     * Shifrlangan karta raqamini deshifrlaydi.
     *
     * @param encryptedText Base64 kodlangan shifrlangan matn
     * @return asl karta raqami
     */
    public String decrypt(String encryptedText) {
        try {
            byte[] combined = Base64.getDecoder().decode(encryptedText);

            byte[] iv = new byte[IV_LENGTH];
            System.arraycopy(combined, 0, iv, 0, IV_LENGTH);

            byte[] cipherText = new byte[combined.length - IV_LENGTH];
            System.arraycopy(combined, IV_LENGTH, cipherText, 0, cipherText.length);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec gcmSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.DECRYPT_MODE, secretKey, gcmSpec);

            byte[] plainText = cipher.doFinal(cipherText);
            return new String(plainText, StandardCharsets.UTF_8);
        } catch (Exception e) {
            log.error("Deshifrlash xatosi", e);
            throw new RuntimeException("Karta raqamini deshifrlashda xatolik yuz berdi", e);
        }
    }
}
