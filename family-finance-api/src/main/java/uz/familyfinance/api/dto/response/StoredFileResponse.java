package uz.familyfinance.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Yuklangan fayl haqida javob — frontend {@code url} ni {@code avatar} maydoniga yozadi. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StoredFileResponse {

    /** Absolyut ochiq URL (API host bilan) — {@code <img src>} da to'g'ridan-to'g'ri ishlatiladi. */
    private String url;

    private String contentType;

    private int sizeBytes;
}
