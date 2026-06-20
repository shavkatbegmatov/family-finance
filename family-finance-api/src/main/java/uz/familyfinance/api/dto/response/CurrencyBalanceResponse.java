package uz.familyfinance.api.dto.response;

import java.math.BigDecimal;

/**
 * D7: bitta valyuta bo'yicha umumiy balans. Umumiy balansni valyutalar bo'yicha ajratib
 * qaytarish uchun (avval har xil valyuta bitta songa qo'shilib noto'g'ri ko'rsatilardi).
 * Ro'yxat summasi bo'yicha kamayuvchi tartibda — birinchisi asosiy valyuta.
 */
public record CurrencyBalanceResponse(String currency, BigDecimal amount) {
}
