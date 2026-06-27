package uz.familyfinance.api.service.telegram;

/**
 * Telegram'dan kelgan foydalanuvchi ma'lumotlari — polling'dan auth service'ga uzatiladi.
 *
 * @param telegramId Telegram user ID (barqaror identifikator)
 * @param firstName  ism (Telegram profilidan)
 * @param lastName   familiya (ixtiyoriy)
 * @param username   @username (ixtiyoriy)
 * @param chatId     tasdiq xabarini yuborish uchun chat ID
 */
public record TelegramUserInfo(
        Long telegramId,
        String firstName,
        String lastName,
        String username,
        Long chatId
) {
}
