package uz.familyfinance.api.config;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import uz.familyfinance.api.security.JwtChannelInterceptor;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtChannelInterceptor jwtChannelInterceptor;

    @Value("${app.cors.allowed-origins:}")
    private String extraOrigins;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Server -> Client uchun prefix'lar
        registry.enableSimpleBroker("/topic", "/queue");
        // Client -> Server uchun prefix
        registry.setApplicationDestinationPrefixes("/app");
        // User-specific xabarlar uchun prefix
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        List<String> origins = new ArrayList<>(Arrays.asList(
                "http://localhost:5175",
                "http://localhost:5178",
                "http://localhost:3000",
                "http://127.0.0.1:5175",
                "http://127.0.0.1:5178",
                "http://192.168.1.33:5175",
                "http://192.168.1.33:5178"
        ));
        if (extraOrigins != null && !extraOrigins.isBlank()) {
            Arrays.stream(extraOrigins.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .forEach(origins::add);
        }
        registry.addEndpoint("/v1/ws")
                .setAllowedOrigins(origins.toArray(String[]::new))
                .withSockJS();
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        // JWT token tekshirish uchun interceptor
        registration.interceptors(jwtChannelInterceptor);
    }
}
