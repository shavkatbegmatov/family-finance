# Changelog

All notable changes to this project will be documented in this file.

## [1.4.0] - 2026-03-04

### Added
- **Bolalar ball tizimi (Point System)** — farzandlarni iqtisodiy savodxonlikka o'rgatuvchi to'liq gamifikatsiya moduli:

  **Backend (Spring Boot):**
  - 7 ta yangi enum: `PointTaskStatus`, `PointTaskRecurrence`, `PointTransactionType`, `PointTaskCategory`, `AchievementType`, `PointInvestmentType`, `PointChallengeStatus`
  - 16 ta yangi entity: `PointConfig`, `PointParticipant`, `PointTask`, `PointBalance`, `PointTransaction`, `PointConversion`, `PointAchievement`, `PointMemberAchievement`, `PointSavingsAccount`, `PointInvestment`, `PointMultiplierEvent`, `PointInflationSnapshot`, `PointShopItem`, `PointPurchase`, `PointChallenge`, `PointChallengeParticipant`
  - 16 ta repository (atomik `@Modifying` query'lar bilan)
  - 12 ta service: config, ishtirokchilar, vazifalar, tranzaksiyalar, konversiya, yutuqlar, jamg'arma, investitsiya, reyting, do'kon, musobaqalar, hisobotlar
  - 13 ta REST controller (CRUD + biznes-logika endpointlari)
  - 28 ta DTO (13 request + 15 response)
  - `PointScheduler` — 7 ta `@Scheduled` job: muddati o'tgan vazifalar, streak tekshirish, recurring vazifalar, investitsiya qaytarishi, inflyatsiya, jamg'arma foizi, musobaqalar yakunlash
  - 11 ta yangi `POINTS_*` permission (`PermissionCode` enum ga qo'shildi)
  - Flyway `V25__point_system.sql` migratsiya (16 jadval, indekslar, permission va achievement seed)

  **Frontend (React + TypeScript):**
  - `points.types.ts` — barcha TypeScript interfeyslari
  - `points.api.ts` — 13 ta API modul (config, participants, tasks, balances, conversions, leaderboard, achievements, savings, investments, shop, challenges, events, reports)
  - 11 ta sahifa: Dashboard, Ishtirokchilar, Vazifalar, Reyting, Tarix, Konversiya, Jamg'arma, Yutuqlar, Do'kon, Musobaqalar, Sozlamalar
  - `usePermission.ts` ga 11 ta `POINTS_*` permission va `canXxx` hooklar qo'shildi
  - Router ga 11 ta yangi `/points/*` lazy-loaded route qo'shildi
  - Sidebar ga "Ball tizimi" (Trophy icon) menyu bandi qo'shildi
  - i18n: `uz.json` va `ru.json` ga ~50 ta tarjima kaliti qo'shildi

  **Asosiy funksiyalar:**
  - Ishtirokchilarni qo'lda qo'shish (FamilyMember bo'lmasa ham)
  - Vazifa yaratish, tayinlash, bajarish, tekshirish, rad etish lifecycle
  - Recurring vazifalar (kunlik/haftalik/oylik)
  - Ball → pul konversiyasi (inflyatsiya hisobga olingan holda)
  - Inflyatsiya mexanizmi (oylik avtomatik qo'llanishi)
  - Jamg'arma (foiz bilan) va investitsiya (STABLE/MODERATE/RISKY)
  - Do'kon — mukofotlarni ball evaziga sotib olish
  - Musobaqalar — ishtirokchilar o'rtasidagi reyting bellashuvi
  - Yutuqlar (achievements) — avtomatik va qo'lda beriladigan
  - Streak bonuslar — ketma-ket kunlik vazifa bajarish uchun
  - Multiplier eventlar — vaqtinchalik ball koeffitsientlari

## [1.3.5] - 2026-03-03

### Fixed
- **Oila daraxti — context menyu qolib ketishi**:
  - Daraxtni drag qilib siljitganda context menyu avtomatik yopilmay qolardi.
  - `onMoveStart` handleri qo'shildi — endi daraxt harakatlana boshlaganda menyu darhol yopiladi.

## [1.3.4] - 2026-03-03

### Fixed
- **Oila daraxti — tahrirlash formasi bo'sh ko'rinishi**:
  - `EditPersonModal` endi barcha a'zolar ro'yxatidan (`/v1/family-members/list`) shaxs qidirish o'rniga bevosita `GET /v1/family-members/:id` orqali ma'lumotlarni yuklaydi.
  - Yangi `usePersonQuery` hook qo'shildi (`useFamilyTreeQueries.ts`).
  - Modal ochilayotganda ma'lumot yuklanguncha spinner ko'rsatiladi (bo'sh forma endi ko'rinmaydi).

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
