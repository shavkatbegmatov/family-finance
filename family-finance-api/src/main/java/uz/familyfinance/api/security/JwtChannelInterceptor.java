package uz.familyfinance.api.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import uz.familyfinance.api.service.SessionService;

import java.util.List;

@Component
@Slf4j
public class JwtChannelInterceptor implements ChannelInterceptor {

    private final JwtTokenProvider jwtTokenProvider;
    private final SessionService sessionService;

    // SessionService -> NotificationDispatcher -> SimpMessagingTemplate zanjiri WS
    // broker konfiguratsiyasi bilan aylanma bog'liqlik hosil qilishi mumkin; @Lazy
    // proksi bilan uziladi (isSessionValid faqat birinchi CONNECT'da chaqiriladi).
    public JwtChannelInterceptor(JwtTokenProvider jwtTokenProvider,
                                 @Lazy SessionService sessionService) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.sessionService = sessionService;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            String authHeader = accessor.getFirstNativeHeader("Authorization");

            if (StringUtils.hasText(authHeader) && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);

                // Imzo/muddatdan tashqari: (1) sessiya DB'da hali faolmi (logout/revoke
                // bo'lgan token WS ochmasin — HTTP filtr bilan bir xil qoida), (2) bu
                // access token bo'lsin (refresh token WS credential sifatida qabul
                // qilinmasin). getTokenUse validateToken'dan KEYIN (&&-qisqa tutashuv)
                // chaqiriladi — noto'g'ri token'da getClaims xato tashlamasligi uchun.
                // Legacy (tokenUse null) tokenlar deploy-xavfsiz o'tadi.
                if (jwtTokenProvider.validateToken(token)
                        && sessionService.isSessionValid(token)
                        && !JwtTokenProvider.TOKEN_USE_REFRESH.equals(jwtTokenProvider.getTokenUse(token))) {
                    String username = jwtTokenProvider.getUsernameFromToken(token);
                    String tokenType = jwtTokenProvider.getTokenType(token);
                    Long userId = jwtTokenProvider.getUserIdFromToken(token);

                    // Principal nomi convertAndSendToUser uchun userId asosida (eski tokenlarda username)
                    String principalName = userId != null ? userId.toString() : username;

                    UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                            principalName,
                            null,
                            List.of(new SimpleGrantedAuthority("ROLE_STAFF"))
                    );

                    accessor.setUser(auth);
                    log.debug("WebSocket authenticated: {} ({})", principalName, tokenType);
                } else {
                    log.warn("Invalid JWT token in WebSocket connection");
                }
            } else {
                log.debug("No Authorization header in WebSocket connection");
            }
        }

        return message;
    }
}
