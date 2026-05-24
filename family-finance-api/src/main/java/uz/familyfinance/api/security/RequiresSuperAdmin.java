package uz.familyfinance.api.security;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Method/class-level annotation: faqat platforma SUPER_ADMIN'lari kira oladi.
 *
 * <p>Aspect {@link SuperAdminAspect} har bir chaqiruvda {@code User.isSuperAdmin}
 * flag'ini tekshiradi. Tekshirish o'tmasa {@code AccessDeniedException} otadi.</p>
 *
 * <p>SUPER_ADMIN cross-scope kirish uchun ishlatiladi va har bir chaqiruv
 * audit log'ga yoziladi (Phase 2 da AuditLogAspect orqali).</p>
 *
 * <pre>
 * {@literal @}RequiresSuperAdmin
 * {@literal @}GetMapping("/super-admin/scopes")
 * public ApiResponse&lt;List&lt;ScopeResponse&gt;&gt; getAllScopes() { ... }
 * </pre>
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface RequiresSuperAdmin {
    String message() default "Bu amal faqat platforma SUPER_ADMIN'lariga ruxsat etilgan";
}
