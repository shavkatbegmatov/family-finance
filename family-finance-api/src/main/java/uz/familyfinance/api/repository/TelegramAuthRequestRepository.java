package uz.familyfinance.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import uz.familyfinance.api.entity.TelegramAuthRequest;

import java.time.LocalDateTime;
import java.util.Optional;

public interface TelegramAuthRequestRepository extends JpaRepository<TelegramAuthRequest, Long> {

    Optional<TelegramAuthRequest> findByRequestId(String requestId);

    /**
     * Eskirgan tasdiq so'rovlarini o'chiradi (qisqa muddatli jadval — tarix saqlanmaydi).
     * Statusdan qat'i nazar: yakunlangan (COMPLETED) yozuv ham keraksiz, eskirgani esa
     * hech qachon ishlatilmasligi kerak. {@code cutoff} — muddatdan keyingi qo'shimcha
     * ehtiyot oynasi (oqim o'rtasidagi so'rovni o'chirib qo'ymaslik uchun).
     */
    @Modifying
    @Query("DELETE FROM TelegramAuthRequest r WHERE r.expiresAt < :cutoff")
    int deleteExpiredBefore(@Param("cutoff") LocalDateTime cutoff);
}
