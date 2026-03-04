package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.dto.request.PointShopItemRequest;
import uz.familyfinance.api.dto.response.PointPurchaseResponse;
import uz.familyfinance.api.dto.response.PointShopItemResponse;
import uz.familyfinance.api.entity.*;
import uz.familyfinance.api.enums.PointTransactionType;
import uz.familyfinance.api.exception.ResourceNotFoundException;
import uz.familyfinance.api.repository.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PointShopService {

    private final PointShopItemRepository shopItemRepository;
    private final PointPurchaseRepository purchaseRepository;
    private final PointBalanceRepository balanceRepository;
    private final PointParticipantService participantService;
    private final PointTransactionService transactionService;
    private final PointConfigService configService;

    @Transactional(readOnly = true)
    public List<PointShopItemResponse> getActiveItems() {
        Long groupId = configService.getCurrentFamilyGroupId();
        return shopItemRepository.findByFamilyGroupIdAndIsActiveTrue(groupId).stream()
                .map(this::toItemResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<PointShopItemResponse> getAllItems() {
        Long groupId = configService.getCurrentFamilyGroupId();
        return shopItemRepository.findByFamilyGroupId(groupId).stream()
                .map(this::toItemResponse).collect(Collectors.toList());
    }

    @Transactional
    public PointShopItemResponse createItem(PointShopItemRequest request) {
        var userDetails = configService.getCurrentUserDetails();
        PointShopItem item = PointShopItem.builder()
                .familyGroup(configService.getCurrentFamilyGroup())
                .name(request.getName())
                .description(request.getDescription())
                .price(request.getPrice())
                .icon(request.getIcon())
                .color(request.getColor())
                .stock(request.getStock())
                .createdBy(userDetails.getUser())
                .build();
        return toItemResponse(shopItemRepository.save(item));
    }

    @Transactional
    public PointShopItemResponse updateItem(Long id, PointShopItemRequest request) {
        PointShopItem item = shopItemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Mahsulot topilmadi"));
        item.setName(request.getName());
        item.setDescription(request.getDescription());
        item.setPrice(request.getPrice());
        item.setIcon(request.getIcon());
        item.setColor(request.getColor());
        item.setStock(request.getStock());
        return toItemResponse(shopItemRepository.save(item));
    }

    @Transactional
    public void deleteItem(Long id) {
        PointShopItem item = shopItemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Mahsulot topilmadi"));
        item.setIsActive(false);
        shopItemRepository.save(item);
    }

    @Transactional
    public PointPurchaseResponse purchase(Long participantId, Long shopItemId) {
        var userDetails = configService.getCurrentUserDetails();
        PointParticipant participant = participantService.findById(participantId);
        PointShopItem item = shopItemRepository.findById(shopItemId)
                .orElseThrow(() -> new ResourceNotFoundException("Mahsulot topilmadi"));

        if (!item.getIsActive()) {
            throw new IllegalStateException("Mahsulot faol emas");
        }

        if (item.getStock() != null && item.getStock() <= 0) {
            throw new IllegalStateException("Mahsulot tugagan");
        }

        PointBalance balance = balanceRepository.findByParticipantId(participantId)
                .orElseThrow(() -> new ResourceNotFoundException("Balans topilmadi"));

        if (balance.getCurrentBalance() < item.getPrice()) {
            throw new IllegalArgumentException("Yetarli ball mavjud emas. Kerak: " + item.getPrice() + ", mavjud: " + balance.getCurrentBalance());
        }

        // Balansdan ayirish
        transactionService.createTransaction(
                participant, PointTransactionType.SHOP_PURCHASE,
                -item.getPrice(),
                "Do'kondan xarid: " + item.getName(),
                null, userDetails.getUser()
        );

        // Stock kamaytirish
        if (item.getStock() != null) {
            item.setStock(item.getStock() - 1);
            shopItemRepository.save(item);
        }

        PointPurchase purchase = PointPurchase.builder()
                .familyGroup(participant.getFamilyGroup())
                .participant(participant)
                .shopItem(item)
                .pointsSpent(item.getPrice())
                .purchaseDate(LocalDateTime.now())
                .build();

        return toPurchaseResponse(purchaseRepository.save(purchase));
    }

    @Transactional
    public PointPurchaseResponse deliver(Long purchaseId) {
        var userDetails = configService.getCurrentUserDetails();
        PointPurchase purchase = purchaseRepository.findById(purchaseId)
                .orElseThrow(() -> new ResourceNotFoundException("Xarid topilmadi"));
        purchase.setIsDelivered(true);
        purchase.setDeliveredAt(LocalDateTime.now());
        purchase.setDeliveredBy(userDetails.getUser());
        return toPurchaseResponse(purchaseRepository.save(purchase));
    }

    @Transactional(readOnly = true)
    public Page<PointPurchaseResponse> getPurchasesByParticipant(Long participantId, Pageable pageable) {
        return purchaseRepository.findByParticipantIdOrderByPurchaseDateDesc(participantId, pageable)
                .map(this::toPurchaseResponse);
    }

    private PointShopItemResponse toItemResponse(PointShopItem item) {
        PointShopItemResponse r = new PointShopItemResponse();
        r.setId(item.getId());
        r.setName(item.getName());
        r.setDescription(item.getDescription());
        r.setPrice(item.getPrice());
        r.setIcon(item.getIcon());
        r.setColor(item.getColor());
        r.setStock(item.getStock());
        r.setIsActive(item.getIsActive());
        r.setCreatedAt(item.getCreatedAt());
        return r;
    }

    private PointPurchaseResponse toPurchaseResponse(PointPurchase p) {
        PointPurchaseResponse r = new PointPurchaseResponse();
        r.setId(p.getId());
        r.setParticipantId(p.getParticipant().getId());
        r.setParticipantName(p.getParticipant().getDisplayName());
        r.setShopItemId(p.getShopItem().getId());
        r.setShopItemName(p.getShopItem().getName());
        r.setPointsSpent(p.getPointsSpent());
        r.setPurchaseDate(p.getPurchaseDate());
        r.setIsDelivered(p.getIsDelivered());
        r.setDeliveredAt(p.getDeliveredAt());
        if (p.getDeliveredBy() != null) {
            r.setDeliveredByName(p.getDeliveredBy().getFullName());
        }
        return r;
    }
}
