package uz.familyfinance.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import uz.familyfinance.api.entity.TelegramAuthRequest;

import java.util.Optional;

public interface TelegramAuthRequestRepository extends JpaRepository<TelegramAuthRequest, Long> {

    Optional<TelegramAuthRequest> findByRequestId(String requestId);
}
