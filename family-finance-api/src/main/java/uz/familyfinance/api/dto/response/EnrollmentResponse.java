package uz.familyfinance.api.dto.response;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * ADR-002 P4: sinfga yozilish javobi. K3 maxfiylik: {@code realName} faqat
 * o'qituvchi/sinf admini yoki yozgan ota-onaga to'ldiriladi, boshqalarga null.
 */
@Getter
@Setter
@NoArgsConstructor
public class EnrollmentResponse {

    private Long id;
    private Long classScopeId;
    private String className;
    private Long familyMemberId;
    private String nickname;
    private String realName;
    private String status;
    private LocalDateTime joinedAt;
}
