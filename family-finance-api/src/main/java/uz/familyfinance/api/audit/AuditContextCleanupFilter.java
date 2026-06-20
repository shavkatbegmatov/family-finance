package uz.familyfinance.api.audit;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Har HTTP so'rov oxirida {@link AuditOriginalStateContext} ni tozalaydi (D5 xotira-oqishi
 * tuzatishi).
 *
 * <p>Nega {@code OncePerRequestFilter} ({@link AuditCorrelationInterceptor} emas): interceptor
 * faqat {@code /v1/**} ga ulangan va {@code /v1/auth/**} ni ISTISNO qiladi — login esa User
 * (Auditable) yuklab {@code @PostLoad} cache'ini to'ldiradi. Servlet filter BARCHA so'rovga
 * (auth + xavfsizlik-filtri ichidagi entity yuklashlarga ham) tegadi, shuning uchun cleanup
 * to'liq bo'ladi.</p>
 *
 * <p>{@code HIGHEST_PRECEDENCE} — eng tashqi filter; uning {@code finally}'si butun so'rov
 * (controller + boshqa filtrlar) tugagach, eng oxirida ishlaydi → so'rov davomida yuklangan
 * har qanday entity holati tozalanadi.</p>
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class AuditContextCleanupFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain)
            throws ServletException, IOException {
        try {
            filterChain.doFilter(request, response);
        } finally {
            // So'rov tugadi — thread qayta ishlatilishidan oldin "asl holat" do'konini tozalash
            AuditOriginalStateContext.clear();
        }
    }
}
