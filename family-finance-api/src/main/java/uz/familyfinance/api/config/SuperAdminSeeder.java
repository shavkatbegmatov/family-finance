package uz.familyfinance.api.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.entity.RoleEntity;
import uz.familyfinance.api.entity.User;
import uz.familyfinance.api.enums.Role;
import uz.familyfinance.api.repository.RoleRepository;
import uz.familyfinance.api.repository.UserRepository;

/**
 * Alohida platforma SUPER_ADMIN akkauntini startup'da yaratadi (idempotent).
 *
 * <p>Super admin — oilasiz/scope'siz "platforma operatori": faqat nazorat (read-only) va
 * global sozlamalar. Akkaunt bu yerda (Flyway'da emas) yaratiladi, chunki boshlang'ich
 * parol env'dan ({@code SUPER_ADMIN_INITIAL_PASSWORD}) keladi — sirlarni migratsiyaga
 * yozmaslik uchun. {@code SUPER_ADMIN} roli esa Flyway {@code V51} da tayyorlangan.</p>
 *
 * <p>Xulq-atvor:</p>
 * <ul>
 *   <li>Env o'rnatilmagan bo'lsa — akkaunt yaratilmaydi, faqat WARNING (deploy-xavfsiz no-op).</li>
 *   <li>{@code superadmin} allaqachon bor bo'lsa — hech narsa qilmaydi (idempotent).</li>
 *   <li>{@code SUPER_ADMIN} roli topilmasa (migratsiya ishlamagan) — WARNING + skip.</li>
 * </ul>
 *
 * <p>{@code primaryScope}/{@code familyGroup} ATAYIN {@code null} qoldiriladi — super admin
 * oilaga bog'lanmaydi. Login paytida {@code AuthService.ensureUserHasScope} super admin uchun
 * no-op bo'lgani sabab scope provisioning ham qilinmaydi.</p>
 */
@Component
@Order(10) // Flyway DataSource init'idan keyin ishlaydi; rol allaqachon tayyor bo'ladi
@RequiredArgsConstructor
@Slf4j
public class SuperAdminSeeder implements CommandLineRunner {

    private static final String SUPER_ADMIN_USERNAME = "superadmin";
    private static final String SUPER_ADMIN_ROLE_CODE = "SUPER_ADMIN";

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${superadmin.initial-password:}")
    private String initialPassword;

    @Override
    @Transactional
    public void run(String... args) {
        if (initialPassword == null || initialPassword.isBlank()) {
            log.warn("SUPER_ADMIN_INITIAL_PASSWORD o'rnatilmagan — '{}' akkaunti yaratilmaydi (skip).",
                    SUPER_ADMIN_USERNAME);
            return;
        }

        if (userRepository.existsByUsername(SUPER_ADMIN_USERNAME)) {
            log.debug("'{}' akkaunti allaqachon mavjud — seeder no-op.", SUPER_ADMIN_USERNAME);
            return;
        }

        RoleEntity superAdminRole = roleRepository.findByCode(SUPER_ADMIN_ROLE_CODE).orElse(null);
        if (superAdminRole == null) {
            log.warn("'{}' roli topilmadi (V51 migratsiya ishlamaganmi?) — '{}' yaratilmaydi.",
                    SUPER_ADMIN_ROLE_CODE, SUPER_ADMIN_USERNAME);
            return;
        }

        User superAdmin = User.builder()
                .username(SUPER_ADMIN_USERNAME)
                .password(passwordEncoder.encode(initialPassword))
                .fullName("Super Administrator")
                .role(Role.ADMIN) // legacy/deprecated maydon (NOT NULL) — haqiqiy huquq roles'dan
                .active(true)
                .isSuperAdmin(true)
                .mustChangePassword(true) // birinchi login'da almashtirish majburiy
                .authProvider("LOCAL")
                .build();
        superAdmin.getRoles().add(superAdminRole);
        // primaryScope va familyGroup ATAYIN null — super admin oilasiz/scope'siz.

        userRepository.save(superAdmin);
        log.info("Platforma SUPER_ADMIN akkaunti yaratildi: '{}' (mustChangePassword=true).",
                SUPER_ADMIN_USERNAME);
    }
}
