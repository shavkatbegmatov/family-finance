package uz.familyfinance.api.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Spring Boot 4 endi Jackson 3 ({@code tools.jackson}) ni avtomatik sozlaydi va web/REST
 * serializatsiyasini Jackson 3 bilan bajaradi. Biroq loyihaning audit ({@code AuditLogService},
 * {@code AuditEntityListener}) va xato-javob ({@code JwtAuthenticationEntryPoint}) kodi hali
 * Jackson 2 ({@code com.fasterxml.jackson}) {@link ObjectMapper}'ini inject qiladi.
 *
 * <p>Spring Boot 4 Jackson 2 {@code ObjectMapper} bean'ini avtomatik yaratmaydi — shu sabab uni
 * qo'lda ta'minlaymiz. {@link JavaTimeModule} bilan: audit/xato javoblari {@code LocalDateTime}
 * maydonlarini ISO-8601 sifatida yozadi (timestamp emas).</p>
 */
@Configuration
public class JacksonConfig {

    @Bean
    public ObjectMapper objectMapper() {
        return JsonMapper.builder()
                .addModule(new JavaTimeModule())
                .build();
    }
}
