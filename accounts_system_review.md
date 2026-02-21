# Hisoblar tizimi (Accounts System) tahlili va takliflar

Sizning joriy tizimingizni (Backend va Database tuzilishini) to'liq tahlil qilib chiqdim. Tizimda yaxshi shakllantirilgan logikalar ko'p (masalan, valyuta boshqaruvi, tranzaksiyalarda yagona standart (double-entry ya'ni debit/credit) borligi). Ammo, siz aytgan maqsadda (bir necha darajadagi hisoblar: 1. Shaxsiy, 2. Oilaviy) ishlashida jiddiy kamchiliklar va xavfsizlik teshiklari mavjud. 

Quyida ekspert sifatidagi tahlilim va takliflarimni keltiraman:

## 1. Joriy holatdagi asosiy muammolar (Kamchiliklar)

> [!WARNING]
> **Global "FAMILY" Scope xatosi (Ma'lumotlar sizib chiqishi / Data Leak)**
> Hozirda backend kodida `AccountScope.FAMILY` qilingan hisoblarga kirish huquqini tekshirish uchun [AccountRepository.java](file:///d:/Projects/FAMILY_FINANCE/family-finance/family-finance-api/src/main/java/uz/familyfinance/api/repository/AccountRepository.java) da quyidagicha SQL so'rov yozilgan: 
> `... OR a.scope = 'FAMILY' OR ...`
> Bu degani, tizimda ro'yxatdan o'tgan **HAR QANDAY** (hatto umuman boshqa begona oiladagi) foydalanuvchi `FAMILY` deb belgilangan barcha hisoblarni ko'ra oladi. Tizimda aniq chegaralangan "Oila guruhi" (Tenant) tushunchasi yo'q. Faqat shajara guruhlari (FamilyUnit) bor, lekin bu butun platformani bir-biridan ajratmaydi.

**Boshqa kamchiliklar:**
- **Hisob Egasi vs Huquqlar (Owner vs Access):** Hisobning `owner`i [FamilyMember](file:///d:/Projects/FAMILY_FINANCE/family-finance/family-finance-api/src/main/java/uz/familyfinance/api/entity/FamilyMember.java#21-131) ga bog'langan, lekin huquqlar (AccountAccess) [User](file:///d:/Projects/FAMILY_FINANCE/family-finance/family-finance-api/src/main/java/uz/familyfinance/api/repository/AccountRepository.java#73-78) jadvaliga bog'langan. Bu arxitekturaviy mantiqsizlikni keltirib chiqaradi (chunki hampa oila a'zosining ham User akkounti bo'lmasligi mumkin, qanday qilib ularga huquq taqsimlanadi?).
- **Oila guruhi tushunchasining yo'qligi:** Foydalanuvchi "Mening oilam" ro'yxatiga kimlar kirishini boshqaradigan markazlashgan `FamilyGroup` (yoki Household) jadvali yo'q.

## 2. Ekspert takliflari (Yangi arxitektura)

Sizning talabingizdagi "Oila darajasida hisoblar" amaliyotini to'g'ri joriy qilish uchun quyidagi amallarni bajarishni taklif qilaman:

### A) Yangi `FamilyGroup` (voki Household) jadvalini yaratish
Platformadagi barcha tizimlar ko'p-oilali (Multi-tenant) ishlashi uchun bitta yangi tushuncha kiritamiz:
1. `FamilyGroup` - Oila guruhi (masalan: "Begmatovlar oilasi"). Unda [id](file:///d:/Projects/FAMILY_FINANCE/family-finance/family-finance-api/src/main/java/uz/familyfinance/api/service/KinshipCalculatorService.java#203-251), `name`, `admin_id` (oila mas'ul shaxsi) mavjud bo'ladi.
2. Har bir [User](file:///d:/Projects/FAMILY_FINANCE/family-finance/family-finance-api/src/main/java/uz/familyfinance/api/repository/AccountRepository.java#73-78) bitta (yoki ko'p) `FamilyGroup` ga a'zo qilinadi (masalan bitta Many-to-Many yoki One-to-Many aloqa orqali, qulayligi `UserFamilyGroup` munosabati).
3. Har bir [FamilyMember](file:///d:/Projects/FAMILY_FINANCE/family-finance/family-finance-api/src/main/java/uz/familyfinance/api/entity/FamilyMember.java#21-131) ham o'zi tegishli bo'lgan `FamilyGroup` ga bog'lanadi. Shunda daraxt ham faqat bir oilaga tegishli ekanligi ajratiladi.

### B) Hisoblar darajasidagi o'zgarishlar
Siz aytgandek, hisoblar 2 darajada bo'ladi:
1. **Shaxsiy (PERSONAL):** Bu hisob faqat shu hisobni ochgan foydalanuvchiga (User) tegishli bo'ladi. Oilaning boshqa a'zolari buni ko'rmaydi, pul o'tkazoldi bo'lmasdan ko'rinmaydi. Lekin egasi istasa, boshqa [User](file:///d:/Projects/FAMILY_FINANCE/family-finance/family-finance-api/src/main/java/uz/familyfinance/api/repository/AccountRepository.java#73-78) ga "AccountAccess" (Ko'rish yoki Boshqarish) huquqini bera oladi.
2. **Oilaviy (FAMILY):** Bu hisob ochilganda, ma'lumotlar bazasida u to'g'ridan-to'g'ri `FamilyGroup` ning IDsiga bog'lanadi (`account.family_group_id`). Backend'dagi o'sha xavfli SQL so'rovi o'rniga, quyidagicha ishlatiladi:
   *Agar hisob FAMILY bo'lsa, uni faqat shu hisob tegishli bo'lgan `FamilyGroup` ga a'zo barchasiga (yoki adminlarga) ruxsat beriladi.*
   * **Mas'ul shaxs / Admin control:** Oila admini (yoki super-admin) oilaviy hisoblarga qo'shish/tahrirlash imkoniga ega bo'ladi. Oilaviy xarajatlar tushumi har qanday oila a'zosi ko'ra olishini / yozishini shu yerdan boshqarish mumkin.

### V) Foydalanuvchi interfeysi (UI) uchun "Oila" sahifasi
Frontend'ga maxsus yangi page qo'shamiz (masalan `/family-group` yoki `/settings/family`).
- Bu joyda foydalanuvchi (agar huquqi bo'lsa) oilaga yangi a'zolarni ("Xotinim", "O'g'lim" deb) Email yoki SMS orqali taklif qila oladi.
- Bu sahifada Oila Admini ularning huquqlarini belgilaydi ("Xarajat kiritishi mumkin", "Balanslarni ko'rishi mumkin emas" va h.k).

## Keyingi qadam uchun savol:
Ushbu taklif qilingan **`FamilyGroup` (Oila guruhi)** konsepsiyasini joriy qilishdan boshlashga ruxsat berasizmi? 
- Bunda avval Backendda migratsiya (SQL) qilib, Accountlarni o'zgartiramiz, so'ngra xavfsizlik (Data isolation) to'g'rilanadi.
- Undan keyin UI da "Oila guruhini boshqarish" panelini qilib beraman.
