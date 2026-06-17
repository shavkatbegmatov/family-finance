package uz.familyfinance.api.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.*;

@Component
@Slf4j
public class JwtTokenProvider {

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${jwt.expiration}")
    private long jwtExpiration;

    @Value("${jwt.refresh-expiration}")
    private long refreshExpiration;

    private SecretKey key;

    // C5: token turini ajratish — access token'ni refresh endpoint'da ishlatishni to'sish uchun.
    public static final String TOKEN_USE_ACCESS = "ACCESS";
    public static final String TOKEN_USE_REFRESH = "REFRESH";
    private static final String CLAIM_TOKEN_USE = "tokenUse";

    @PostConstruct
    public void init() {
        byte[] keyBytes = Decoders.BASE64.decode(jwtSecret);
        this.key = Keys.hmacShaKeyFor(keyBytes);
    }

    public String generateToken(Authentication authentication) {
        UserDetails userDetails = (UserDetails) authentication.getPrincipal();
        if (userDetails instanceof CustomUserDetails) {
            CustomUserDetails customUserDetails = (CustomUserDetails) userDetails;
            // Phase 2: Login paytida default activeScopeId — primaryScope dan
            Long activeScopeId = customUserDetails.getUser().getPrimaryScope() != null
                    ? customUserDetails.getUser().getPrimaryScope().getId()
                    : null;
            return generateStaffTokenWithPermissions(
                    customUserDetails.getUsername(),
                    customUserDetails.getId(),
                    customUserDetails.getRoleCodes(),
                    customUserDetails.getPermissions(),
                    activeScopeId
            );
        }
        return generateToken(userDetails.getUsername());
    }

    public String generateToken(String username) {
        return generateToken(username, "STAFF");
    }

    public String generateToken(String username, String tokenType) {
        return generateToken(username, tokenType, null);
    }

    public String generateToken(String username, String tokenType, Long userId) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpiration);

        var builder = Jwts.builder()
                // jti — har token NOYOB bo'lishi uchun (bir xil user bir soniyada qayta
                // login qilsa, iat soniya aniqligida bir xil bo'lib, refresh_token_hash
                // UNIQUE constraint'ini buzardi → 500). UUID buni oldini oladi.
                .id(UUID.randomUUID().toString())
                .subject(username)
                .claim(CLAIM_TOKEN_USE, TOKEN_USE_ACCESS)
                .claim("type", tokenType)
                .issuedAt(now)
                .expiration(expiryDate);

        if (userId != null) {
            builder.claim("userId", userId);
        }

        return builder.signWith(key).compact();
    }

    /**
     * Generate token with permissions for staff users.
     * Backward-compatible overload — calls full version with null activeScopeId.
     */
    public String generateStaffTokenWithPermissions(String username, Long userId,
                                                    Set<String> roles, Set<String> permissions) {
        return generateStaffTokenWithPermissions(username, userId, roles, permissions, null);
    }

    /**
     * Phase 2: Generate token with permissions AND active scope ID claim.
     * The active scope determines which Scope's data is shown by default —
     * user can switch via POST /v1/auth/switch-scope.
     */
    public String generateStaffTokenWithPermissions(String username, Long userId,
                                                    Set<String> roles, Set<String> permissions,
                                                    Long activeScopeId) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpiration);

        var builder = Jwts.builder()
                // jti — har token NOYOB bo'lishi uchun (bir xil user bir soniyada qayta
                // login qilsa, iat soniya aniqligida bir xil bo'lib, refresh_token_hash
                // UNIQUE constraint'ini buzardi → 500). UUID buni oldini oladi.
                .id(UUID.randomUUID().toString())
                .subject(username)
                .claim(CLAIM_TOKEN_USE, TOKEN_USE_ACCESS)
                .claim("type", "STAFF")
                .claim("userId", userId)
                .claim("roles", new ArrayList<>(roles))
                .claim("permissions", new ArrayList<>(permissions))
                .issuedAt(now)
                .expiration(expiryDate);

        if (activeScopeId != null) {
            builder.claim("activeScopeId", activeScopeId);
        }

        return builder.signWith(key).compact();
    }

    public String generateRefreshToken(String username) {
        return generateRefreshToken(username, "STAFF");
    }

    public String generateRefreshToken(String username, String tokenType) {
        return generateRefreshToken(username, tokenType, null);
    }

    public String generateRefreshToken(String username, String tokenType, Long userId) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + refreshExpiration);

        var builder = Jwts.builder()
                // jti — har token NOYOB bo'lishi uchun (bir xil user bir soniyada qayta
                // login qilsa, iat soniya aniqligida bir xil bo'lib, refresh_token_hash
                // UNIQUE constraint'ini buzardi → 500). UUID buni oldini oladi.
                .id(UUID.randomUUID().toString())
                .subject(username)
                .claim(CLAIM_TOKEN_USE, TOKEN_USE_REFRESH)
                .claim("type", tokenType)
                .issuedAt(now)
                .expiration(expiryDate);

        if (userId != null) {
            builder.claim("userId", userId);
        }

        return builder.signWith(key).compact();
    }

    // Staff uchun token generatsiya (userId bilan)
    public String generateStaffToken(String username, Long userId) {
        return generateToken(username, "STAFF", userId);
    }

    public String generateStaffRefreshToken(String username, Long userId) {
        return generateRefreshToken(username, "STAFF", userId);
    }

    public String getUsernameFromToken(String token) {
        Claims claims = getClaims(token);
        return claims.getSubject();
    }

    public Long getUserIdFromToken(String token) {
        Claims claims = getClaims(token);
        return claims.get("userId", Long.class);
    }

    /**
     * Token "tokenUse" claim'ini qaytaradi (ACCESS | REFRESH). Eski (claim'siz)
     * token'lar uchun null — refresh endpoint'da REFRESH talab qilinadi.
     */
    public String getTokenUse(String token) {
        return getClaims(token).get(CLAIM_TOKEN_USE, String.class);
    }

    public String getTokenType(String token) {
        Claims claims = getClaims(token);
        String type = claims.get("type", String.class);
        return type != null ? type : "STAFF"; // Default STAFF for old tokens
    }

    @SuppressWarnings("unchecked")
    public Set<String> getRolesFromToken(String token) {
        Claims claims = getClaims(token);
        List<String> roles = claims.get("roles", List.class);
        return roles != null ? new HashSet<>(roles) : new HashSet<>();
    }

    @SuppressWarnings("unchecked")
    public Set<String> getPermissionsFromToken(String token) {
        Claims claims = getClaims(token);
        List<String> permissions = claims.get("permissions", List.class);
        return permissions != null ? new HashSet<>(permissions) : new HashSet<>();
    }

    /**
     * Phase 2: Get the active scope ID from JWT token (added by switch-scope endpoint
     * or set to User.primaryScope on login). Returns null for legacy tokens.
     */
    public Long getActiveScopeIdFromToken(String token) {
        Claims claims = getClaims(token);
        Object value = claims.get("activeScopeId");
        if (value == null) return null;
        if (value instanceof Number n) return n.longValue();
        try {
            return Long.parseLong(value.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private Claims getClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token);
            return true;
        } catch (MalformedJwtException ex) {
            log.error("Invalid JWT token");
        } catch (ExpiredJwtException ex) {
            log.error("Expired JWT token");
        } catch (UnsupportedJwtException ex) {
            log.error("Unsupported JWT token");
        } catch (IllegalArgumentException ex) {
            log.error("JWT claims string is empty");
        }
        return false;
    }
}
