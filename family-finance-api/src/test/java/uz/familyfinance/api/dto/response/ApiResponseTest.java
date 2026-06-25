package uz.familyfinance.api.dto.response;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import uz.familyfinance.api.enums.ErrorCode;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * {@link ApiResponse} fabrika metodlari (D3 — errorCode) uchun toza-mantiq testlari.
 */
@DisplayName("ApiResponse")
class ApiResponseTest {

    @Test
    @DisplayName("error(message) — errorCode null (legacy, additive)")
    void errorWithoutCode() {
        ApiResponse<Void> res = ApiResponse.error("xato");
        assertThat(res.isSuccess()).isFalse();
        assertThat(res.getMessage()).isEqualTo("xato");
        assertThat(res.getErrorCode()).isNull();
    }

    @Test
    @DisplayName("error(message, code) — errorCode enum nomi sifatida yoziladi")
    void errorWithCode() {
        ApiResponse<Void> res = ApiResponse.error("topilmadi", ErrorCode.NOT_FOUND);
        assertThat(res.isSuccess()).isFalse();
        assertThat(res.getMessage()).isEqualTo("topilmadi");
        assertThat(res.getErrorCode()).isEqualTo("NOT_FOUND");
    }

    @Test
    @DisplayName("success — errorCode null")
    void successNoCode() {
        ApiResponse<String> res = ApiResponse.success("data");
        assertThat(res.isSuccess()).isTrue();
        assertThat(res.getErrorCode()).isNull();
    }
}
