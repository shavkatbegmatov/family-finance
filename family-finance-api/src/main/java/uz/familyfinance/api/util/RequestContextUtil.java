package uz.familyfinance.api.util;

import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * Utility for extracting client metadata (IP address, User-Agent) from the current HTTP request.
 *
 * <p>Logic extracted from {@code AuditLogService} and {@code AuditEntityListener} where it was
 * duplicated (D5 refactor). Behaviour is identical: IP resolution prefers the {@code X-Forwarded-For}
 * header (first entry) for proxied requests and falls back to {@code remoteAddr}; the User-Agent
 * comes straight from the {@code User-Agent} header. Any failure is logged at debug and yields
 * {@code null}.</p>
 */
@Slf4j
public final class RequestContextUtil {

    private RequestContextUtil() {
    }

    /**
     * Resolve the {@link HttpServletRequest} bound to the current thread, or {@code null} if there
     * is no active servlet request (e.g. scheduled/system operations).
     */
    public static HttpServletRequest getCurrentRequest() {
        ServletRequestAttributes attributes =
                (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        return attributes != null ? attributes.getRequest() : null;
    }

    /**
     * Get the client IP address from the given HTTP request.
     * Checks the {@code X-Forwarded-For} header first (for proxied requests),
     * then falls back to the remote address.
     *
     * @param request the current HTTP request, may be {@code null}
     * @return the client IP address, or {@code null} if not available
     */
    public static String getClientIpAddress(HttpServletRequest request) {
        try {
            if (request != null) {
                String xForwardedFor = request.getHeader("X-Forwarded-For");
                if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
                    return xForwardedFor.split(",")[0].trim();
                }
                return request.getRemoteAddr();
            }
        } catch (Exception e) {
            log.debug("Could not get client IP address: {}", e.getMessage());
        }
        return null;
    }

    /**
     * Get the {@code User-Agent} header from the given HTTP request.
     *
     * @param request the current HTTP request, may be {@code null}
     * @return the User-Agent string, or {@code null} if not available
     */
    public static String getUserAgent(HttpServletRequest request) {
        try {
            if (request != null) {
                return request.getHeader("User-Agent");
            }
        } catch (Exception e) {
            log.debug("Could not get user agent: {}", e.getMessage());
        }
        return null;
    }
}
