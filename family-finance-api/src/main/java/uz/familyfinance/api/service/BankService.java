package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.dto.request.BankRequest;
import uz.familyfinance.api.dto.response.BankResponse;
import uz.familyfinance.api.entity.Bank;
import uz.familyfinance.api.entity.BankBin;
import uz.familyfinance.api.exception.BadRequestException;
import uz.familyfinance.api.exception.ResourceNotFoundException;
import uz.familyfinance.api.repository.BankBinRepository;
import uz.familyfinance.api.repository.BankRepository;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class BankService {

    private final BankRepository bankRepository;
    private final BankBinRepository bankBinRepository;

    @Transactional(readOnly = true)
    public Page<BankResponse> getBanks(String search, Pageable pageable) {
        Page<Bank> banks;
        if (search != null && !search.trim().isEmpty()) {
            banks = bankRepository.findByNameContainingIgnoreCaseOrShortNameContainingIgnoreCase(search, search,
                    pageable);
        } else {
            banks = bankRepository.findAll(pageable);
        }
        return banks.map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public List<BankResponse> getActiveBanks() {
        return bankRepository.findByIsActiveTrueOrderByNameAsc()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public BankResponse getBankById(Long id) {
        return bankRepository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Bank topilmadi"));
    }

    @Transactional
    public BankResponse createBank(BankRequest request) {
        Bank bank = Bank.builder()
                .name(request.getName())
                .shortName(request.getShortName())
                .mfo(request.getMfo())
                .logoUrl(request.getLogoUrl())
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .build();

        bank = bankRepository.save(bank);

        // Save bins
        if (request.getBinPrefixes() != null && !request.getBinPrefixes().isEmpty()) {
            saveBankBins(bank, request.getBinPrefixes());
        }

        return toResponse(bank);
    }

    @Transactional
    public BankResponse updateBank(Long id, BankRequest request) {
        Bank bank = bankRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Bank topilmadi"));

        if (request.getName() != null)
            bank.setName(request.getName());
        if (request.getShortName() != null)
            bank.setShortName(request.getShortName());
        if (request.getMfo() != null)
            bank.setMfo(request.getMfo());
        if (request.getLogoUrl() != null)
            bank.setLogoUrl(request.getLogoUrl());
        if (request.getIsActive() != null)
            bank.setIsActive(request.getIsActive());

        bank = bankRepository.save(bank);

        if (request.getBinPrefixes() != null) {
            bankBinRepository.deleteByBankId(bank.getId());
            saveBankBins(bank, request.getBinPrefixes());
        }

        return toResponse(bank);
    }

    private void saveBankBins(Bank bank, List<String> binPrefixes) {
        for (String prefix : binPrefixes) {
            if (prefix == null || prefix.trim().isEmpty())
                continue;

            String cleanPrefix = prefix.trim();
            if (bankBinRepository.existsByBinPrefix(cleanPrefix)) {
                log.warn("BIN prefix {} already exists. Skipping...", cleanPrefix);
                continue;
            }

            BankBin bin = BankBin.builder()
                    .bank(bank)
                    .binPrefix(cleanPrefix)
                    .build();
            bankBinRepository.save(bin);
        }
    }

    @Transactional(readOnly = true)
    public BankResponse resolveBankByCardNumber(String cardNumber) {
        if (cardNumber == null || cardNumber.isEmpty()) {
            throw new BadRequestException("Karta raqami kiritilmagan");
        }

        String cleanNumber = cardNumber.replaceAll("\\s", "");

        Optional<BankBin> match = bankBinRepository.findBestMatchForCardNumber(cleanNumber);
        if (match.isPresent()) {
            return toResponse(match.get().getBank());
        }

        return null; // Return empty response correctly without 404, because it's an auto-detect call
    }

    private BankResponse toResponse(Bank bank) {
        BankResponse response = new BankResponse();
        response.setId(bank.getId());
        response.setName(bank.getName());
        response.setShortName(bank.getShortName());
        response.setMfo(bank.getMfo());
        response.setLogoUrl(bank.getLogoUrl());
        response.setIsActive(bank.getIsActive());
        response.setCreatedAt(bank.getCreatedAt());

        if (bank.getBankBins() != null) {
            response.setBinPrefixes(bank.getBankBins().stream()
                    .map(BankBin::getBinPrefix)
                    .collect(Collectors.toList()));
        } else {
            response.setBinPrefixes(new java.util.ArrayList<>());
        }

        return response;
    }
}
