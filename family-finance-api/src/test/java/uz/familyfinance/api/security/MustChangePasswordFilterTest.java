package uz.familyfinance.api.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import uz.familyfinance.api.entity.User;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.List;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * {@link MustChangePasswordFilter} — lockout-kritik qaror mantig'i (usul + allow-list +
 * bayroq). Bir paketda bo'lgani uchun protected {@code doFilterInternal} to'g'ridan
 * chaqiriladi (OncePerRequestFilter mashinasi chetlab o'tiladi).
 */
class MustChangePasswordFilterTest {

    private final MustChangePasswordFilter filter = new MustChangePasswordFilter();

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    private void authenticate(boolean mustChangePassword) {
        User user = mock(User.class);
        when(user.getMustChangePassword()).thenReturn(mustChangePassword);
        CustomUserDetails principal = mock(CustomUserDetails.class);
        when(principal.getUser()).thenReturn(user);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, List.of()));
    }

    private HttpServletRequest request(String method, String uri) {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getMethod()).thenReturn(method);
        when(req.getRequestURI()).thenReturn(uri);
        return req;
    }

    private HttpServletResponse responseCapturingBody() throws Exception {
        HttpServletResponse resp = mock(HttpServletResponse.class);
        when(resp.getWriter()).thenReturn(new PrintWriter(new StringWriter()));
        return resp;
    }

    @Test
    void blocksMutationWhenMustChangePassword() throws Exception {
        authenticate(true);
        HttpServletResponse resp = responseCapturingBody();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilterInternal(request("POST", "/v1/transactions"), resp, chain);

        verify(resp).setStatus(HttpServletResponse.SC_FORBIDDEN);
        verify(chain, never()).doFilter(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
    }

    @Test
    void allowsReadsWhenMustChangePassword() throws Exception {
        authenticate(true);
        HttpServletResponse resp = responseCapturingBody();
        FilterChain chain = mock(FilterChain.class);
        HttpServletRequest req = request("GET", "/v1/accounts");

        filter.doFilterInternal(req, resp, chain);

        verify(chain).doFilter(req, resp);
        verify(resp, never()).setStatus(HttpServletResponse.SC_FORBIDDEN);
    }

    @Test
    void allowsChangePasswordEndpointEvenWithContextPathPrefix() throws Exception {
        authenticate(true);
        HttpServletResponse resp = responseCapturingBody();
        FilterChain chain = mock(FilterChain.class);
        // context-path prefiksi bilan ham (endsWith) o'tishi shart — aks holda lockout bo'lardi
        HttpServletRequest req = request("POST", "/api/v1/auth/change-password");

        filter.doFilterInternal(req, resp, chain);

        verify(chain).doFilter(req, resp);
        verify(resp, never()).setStatus(HttpServletResponse.SC_FORBIDDEN);
    }

    @Test
    void allowsLogoutAndRefreshWhenMustChangePassword() throws Exception {
        authenticate(true);
        for (String uri : List.of("/v1/auth/logout", "/v1/auth/refresh-token")) {
            HttpServletResponse resp = responseCapturingBody();
            FilterChain chain = mock(FilterChain.class);
            HttpServletRequest req = request("POST", uri);

            filter.doFilterInternal(req, resp, chain);

            verify(chain).doFilter(req, resp);
            verify(resp, never()).setStatus(HttpServletResponse.SC_FORBIDDEN);
        }
    }

    @Test
    void allowsMutationWhenFlagFalse() throws Exception {
        authenticate(false);
        HttpServletResponse resp = responseCapturingBody();
        FilterChain chain = mock(FilterChain.class);
        HttpServletRequest req = request("POST", "/v1/transactions");

        filter.doFilterInternal(req, resp, chain);

        verify(chain).doFilter(req, resp);
        verify(resp, never()).setStatus(HttpServletResponse.SC_FORBIDDEN);
    }

    @Test
    void ignoresUnauthenticatedRequests() throws Exception {
        // SecurityContext bo'sh — bu filter aralashmaydi (auth talablari boshqa joyda)
        HttpServletResponse resp = responseCapturingBody();
        FilterChain chain = mock(FilterChain.class);
        HttpServletRequest req = request("POST", "/v1/transactions");

        filter.doFilterInternal(req, resp, chain);

        verify(chain).doFilter(req, resp);
        verify(resp, never()).setStatus(HttpServletResponse.SC_FORBIDDEN);
    }
}
