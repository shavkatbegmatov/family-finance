# Changelog

All notable changes to this project will be documented in this file.

## [1.3.3] - 2026-02-26

### Added
- **Account Card Form Improvements**:
  - Implemented automatic card type detection from BIN (HUMO, UZCARD, UZCARD_COBADGE, VISA, MASTERCARD, UNIONPAY).
  - Added Luhn algorithm validation logic with visual error cues for a complete 16-digit entry.
  - Formatted card numbers visually during input with spaced segments (`XXXX XXXX XXXX XXXX`).
  - Added visual card type badges embedded within the card number input field based on detection.
  - Introduced a "Plastik karta" vs "Virtual karta" radio toggle (`isVirtual` boolean tracking).
  - Backend and database expanded to record and retrieve robust `is_virtual` card metadata (Flyway migration `V23`).

### Fixed
- Backend `AccountService` logic updated so that when an `Account` of type `BANK_CARD` is created using the initial form creation wizard, the submitted `Card` details are actually captured and stored to the `cards` database table. Previously, these were dropped.

## [1.3.2] - 2026-02-25

### Added
- Created dedicated standalone "Oila sozlamalari" (Family Group Settings) page with its own routing layout.
- Added "Manzillar tarixi" (Address History) functionality to allow chronological tracking of when families move.
- Generated and visually represented a 6-character Unique Code per Family.
- Extended `FamilyGroupService` backend infrastructure (including a new `FamilyAddressHistory` entity) to store multiple addressed histories properly via a Flyway script (`V21` and `V22`).

### Fixed
- Solved an issue affecting new shared accounts without an individual owner where all accounts sharing a type and currency incorrectly received the exact identical account code. It now scales robustly with the family group sequence.
- Addressed multiple React mapping console warnings and navigation back-button logical gaps.
