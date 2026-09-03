package uz.familyfinance.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import uz.familyfinance.api.entity.base.BaseEntity;

import java.util.UUID;

/**
 * Ilova ichida saqlanadigan rasm fayli (avatar) — V62.
 *
 * <p>Baytlar PostgreSQL {@code bytea} ustunida; tashqariga {@code publicId} (UUID) orqali
 * {@code GET /v1/files/{publicId}} bilan beriladi. Auditable EMAS — baytlarni audit
 * jurnaliga yozishning ma'nosi yo'q.</p>
 */
@Entity
@Table(
        name = "stored_files",
        uniqueConstraints = @UniqueConstraint(name = "uk_stored_files_public_id", columnNames = "public_id")
)
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StoredFile extends BaseEntity {

    /** Ochiq URL identifikatori — taxmin qilib bo'lmaydigan tasodifiy UUID. */
    @Column(name = "public_id", nullable = false, updatable = false)
    private UUID publicId;

    /** Magic-bytes bo'yicha ANIQLANGAN tur (mijoz yuborgan Content-Type'ga ishonilmaydi). */
    @Column(name = "content_type", nullable = false, length = 100)
    private String contentType;

    @Column(name = "size_bytes", nullable = false)
    private int sizeBytes;

    @Column(name = "data", nullable = false)
    private byte[] data;

    /** Yuklagan foydalanuvchi (users.id); user o'chsa NULL bo'ladi (FK ON DELETE SET NULL). */
    @Column(name = "uploaded_by")
    private Long uploadedBy;
}
