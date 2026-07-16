package uz.familyfinance.api.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Set;

/**
 * {@code mustChangePassword=true} bo'lgan foydalanuvchini server tomonda cheklaydi.
 *
 * <p>Muammo: vaqtinchalik parolli (admin yaratgan yoki reset qilingan) foydalanuvchi
 * to'liq ruxsatli access token oladi va parolini o'zgartirmasdan turib har qanday
 * amalni bajara olardi — bayroq faqat frontend'da ({@code requiresPasswordChange})
 * o'qilardi, server majburlamasdi. Skript/oddiy client bu himoyani chetlab o'tishi
 * mumkin edi.</p>
 *
 * <p>Yechim (lockout-xavfsiz): O'QISH (GET/HEAD/OPTIONS) doim ochiq — foydalanuvchi
 * ilovani yuklab, parol-o'zgartirish ekranini ko'ra oladi. Faqat MUTATSIYALAR
 * (POST/PUT/PATCH/DELETE) bloklanadi, quyidagi zarur auth endpoint'lari bundan
 * mustasno: parol o'zgartirish, chiqish, token yangilash. Parol o'zgargach bayroq
 * DB'da {@code false} bo'ladi va cheklov o'z-o'zidan to'xtaydi.</p>
 *
 * <p>{@link JwtAuthenticationFilter}'dan KEYIN ishga tushadi (SecurityContext to'ldirilgan
 * bo'lishi shart) — {@code SecurityConfig.addFilterAfter} bilan.</p>
 */
@Component
@Slf4j
public class MustChangePasswordFilter extends OncePerRequestFilter {

    private static final Set<String> MUTATION_METHODS = Set.of("POST", "PUT", "PATCH", "DELETE");

    /**
     * Mutatsiya bo'lsa ham ruxsat etilgan endpoint'lar (URI oxiri bilan solishtiriladi —
     * context-path prefiksidan mustaqil). Parol-o'zgartirish oqimiga zarur bo'lganlargina.
     */
    private static final Set<String> ALLOWED_MUTATION_SUFFIXES = Set.of(
            "/v1/auth/change-password",
            "/v1/auth/logout",
            "/v1/auth/refresh-token"
    );

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        if (isBlockedMutation(request)) {
            writeForbidden(response);
            return;
        }
        filterChain.doFilter(request, response);
    }

    private boolean isBlockedMutation(HttpServletRequest request) {
        if (!MUTATION_METHODS.contains(request.getMethod())) {
            return false; // o'qish (GET/HEAD/OPTIONS) — hech qachon bloklanmaydi (lockout yo'q)
        }
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (!(auth != null && auth.getPrincipal() instanceof CustomUserDetails userDetails)) {
            return false; // autentifikatsiyasiz so'rovni bu filter tekshirmaydi
        }
        if (!Boolean.TRUE.equals(userDetails.getUser().getMustChangePassword())) {
            return false; // parol o'zgartirilishi shart emas
        }
        String uri = request.getRequestURI();
        return ALLOWED_MUTATION_SUFFIXES.stream().noneMatch(uri::endsWith);
    }

    private void writeForbidden(HttpServletResponse response) throws IOException {
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write(
                "{\"success\":false,"
                + "\"code\":\"PASSWORD_CHANGE_REQUIRED\","
                + "\"message\":\"Amalni bajarishdan oldin parolingizni o'zgartiring.\"}");
    }
}
