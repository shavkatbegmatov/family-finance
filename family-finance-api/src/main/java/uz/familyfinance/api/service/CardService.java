package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.dto.request.CardRequest;
import uz.familyfinance.api.dto.response.CardResponse;
import uz.familyfinance.api.entity.Account;
import uz.familyfinance.api.entity.Card;
import uz.familyfinance.api.enums.AccountType;
import uz.familyfinance.api.exception.BadRequestException;
import uz.familyfinance.api.exception.ResourceNotFoundException;
import uz.familyfinance.api.repository.CardRepository;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CardService {

    private final CardRepository cardRepository;
    private final AccountService accountService;
    private final CardEncryptionService encryptionService;

    @Transactional(readOnly = true)
    public List<CardResponse> getCardsByAccount(Long accountId) {
        return cardRepository.findByAccountIdAndIsActiveTrue(accountId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public CardResponse addCard(Long accountId, CardRequest request) {
        Account account = accountService.findById(accountId);

        if (account.getType() != AccountType.BANK_CARD) {
            throw new BadRequestException("Karta faqat BANK_CARD turidagi hisobga qo'shilishi mumkin");
        }

        String cardNumber = request.getCardNumber().replaceAll("\\s", "");
        if (cardNumber.length() != 16) {
            throw new BadRequestException("Karta raqami 16 ta raqamdan iborat bo'lishi kerak");
        }

        Card card = Card.builder()
                .account(account)
                .cardType(request.getCardType())
                .cardBin(cardNumber.substring(0, 6))
                .cardLastFour(cardNumber.substring(12))
                .cardNumberEncrypted(encryptionService.encrypt(cardNumber))
                .cardHolderName(request.getCardHolderName())
                .expiryDate(request.getExpiryDate())
                .isVirtual(false) // Assuming CardRequest doesn't have isVirtual, or if it does, use it. Let's
                                  // see... CardRequest doesn't have it right now.
                .build();

        return toResponse(cardRepository.save(card));
    }

    @Transactional
    public CardResponse updateCard(Long cardId, CardRequest request) {
        Card card = findCardById(cardId);

        if (request.getCardType() != null) {
            card.setCardType(request.getCardType());
        }
        if (request.getCardHolderName() != null) {
            card.setCardHolderName(request.getCardHolderName());
        }
        if (request.getExpiryDate() != null) {
            card.setExpiryDate(request.getExpiryDate());
        }
        if (request.getCardNumber() != null) {
            String cardNumber = request.getCardNumber().replaceAll("\\s", "");
            card.setCardBin(cardNumber.substring(0, 6));
            card.setCardLastFour(cardNumber.substring(12));
            card.setCardNumberEncrypted(encryptionService.encrypt(cardNumber));
        }

        return toResponse(cardRepository.save(card));
    }

    @Transactional
    public void deleteCard(Long cardId) {
        Card card = findCardById(cardId);
        card.setIsActive(false);
        cardRepository.save(card);
    }

    /**
     * Karta raqamini to'liq ko'rsatish (deshifrlash).
     * Faqat OWNER huquqiga ega foydalanuvchi uchun.
     */
    @Transactional(readOnly = true)
    public String revealCardNumber(Long cardId) {
        Card card = findCardById(cardId);
        if (card.getCardNumberEncrypted() == null) {
            throw new BadRequestException("Bu karta uchun to'liq raqam saqlanmagan");
        }
        return encryptionService.decrypt(card.getCardNumberEncrypted());
    }

    private Card findCardById(Long cardId) {
        return cardRepository.findById(cardId)
                .orElseThrow(() -> new ResourceNotFoundException("Karta topilmadi: " + cardId));
    }

    private CardResponse toResponse(Card card) {
        CardResponse r = new CardResponse();
        r.setId(card.getId());
        r.setAccountId(card.getAccount().getId());
        r.setCardType(card.getCardType());
        r.setCardBin(card.getCardBin());
        r.setCardLastFour(card.getCardLastFour());
        r.setMaskedNumber(card.getMaskedNumber());
        r.setCardHolderName(card.getCardHolderName());
        r.setExpiryDate(card.getExpiryDate());
        r.setIsActive(card.getIsActive());
        r.setCreatedAt(card.getCreatedAt());
        return r;
    }
}
