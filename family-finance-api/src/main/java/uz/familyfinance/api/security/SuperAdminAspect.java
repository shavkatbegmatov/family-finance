package uz.familyfinance.api.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;

/**
 * {@link RequiresSuperAdmin} annotatsiyali metod/klasslarga kirishni tekshiruvchi aspect.
 *
 * <p>User.isSuperAdmin flag'ini tekshiradi. Tekshirish o'tmasa
 * AccessDeniedException otadi va log'ga warning yoziladi.</p>
 */
@Aspect
@Component
@RequiredArgsConstructor
@Slf4j
public class SuperAdminAspect {

    @Before("@annotation(uz.familyfinance.api.security.RequiresSuperAdmin) "
          + "|| @within(uz.familyfinance.api.security.RequiresSuperAdmin)")
    public void checkSuperAdmin(JoinPoint joinPoint) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("Autentifikatsiya talab qilinadi");
        }

        Object principal = authentication.getPrincipal();
        if (!(principal instanceof CustomUserDetails userDetails)) {
            throw new AccessDeniedException("Noto'g'ri foydalanuvchi konteksti");
        }

        boolean isSuperAdmin = Boolean.TRUE.equals(userDetails.getUser().getIsSuperAdmin());
        if (!isSuperAdmin) {
            String message = resolveMessage(joinPoint);
            log.warn("SUPER_ADMIN access DENIED — user={} attempted {}",
                    userDetails.getUsername(), joinPoint.getSignature().toShortString());
            throw new AccessDeniedException(message);
        }

        log.info("SUPER_ADMIN access — user={} invoked {}",
                userDetails.getUsername(), joinPoint.getSignature().toShortString());
    }

    private String resolveMessage(JoinPoint joinPoint) {
        try {
            MethodSignature signature = (MethodSignature) joinPoint.getSignature();
            Method method = signature.getMethod();
            RequiresSuperAdmin annotation = method.getAnnotation(RequiresSuperAdmin.class);
            if (annotation == null) {
                annotation = joinPoint.getTarget().getClass().getAnnotation(RequiresSuperAdmin.class);
            }
            return annotation != null ? annotation.message()
                    : "Bu amal faqat platforma SUPER_ADMIN'lariga ruxsat etilgan";
        } catch (Exception e) {
            return "Bu amal faqat platforma SUPER_ADMIN'lariga ruxsat etilgan";
        }
    }
}
