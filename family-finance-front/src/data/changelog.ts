export interface ChangelogEntry {
    version: string;
    date: string;
    title: string;
    features: string[];
    fixes: string[];
}

export const changelogData: ChangelogEntry[] = [
    {
        version: '1.7.0',
        date: '2026-06-11 16:00',
        title: "Mobil ko'rinish: yagona dizayn standarti",
        features: [
            "Barcha sahifalar yagona sarlavha standartiga o'tkazildi — telefonda sahifa nomi endi faqat yuqoridagi panelda bitta marta ko'rinadi (avval ba'zi sahifalarda ikki marta takrorlanardi), bu kontent uchun ko'proq joy ochadi.",
            "Telefonda kartalar va bo'limlardagi ortiqcha bo'sh joylar kamaytirildi — bir ekranga ko'proq ma'lumot sig'adi, ko'rinish esa yengilroq.",
        ],
        fixes: [
            "Telefonda mayda tugmalar (filtrlar, ro'yxat amallari, sahifa tanlagichlar) kattalashtirildi — endi barmoq bilan bexato bosiladi.",
            "Hisoblar sahifasidagi filtr belgilarini olib tashlash (×) tugmalari kattaroq va qulayroq bo'ldi.",
        ],
    },
    {
        version: '1.6.7',
        date: '2026-06-10 10:40',
        title: "3D shajara: porlash yumshatildi, ismlar o'qishli bo'ldi",
        features: [],
        fixes: [
            "3D \"galaktika\" ko'rinishidagi porlash (glow) effekti juda kuchli bo'lib, ism yorliqlari ko'rinmay qolardi — endi porlash ancha yumshoq, va ismlar atrofidagi nozik to'q kontur tufayli porlash ostida ham aniq o'qiladi.",
        ],
    },
    {
        version: '1.6.6',
        date: '2026-06-10 09:30',
        title: "3D shajara ko'rinishi yanada jonli va silliq",
        features: [
            "3D shajara grafida shaxslar endi yumshoq porlaydi (glow) — chuqur kosmik fonda professional \"galaktika\" ko'rinishi. Porlashni yuqori-o'ng burchakdagi tugma orqali yoqib yoki o'chirib qo'yish mumkin.",
            "Ko'proq bog'langan (markaziy) shaxslar kattaroq ko'rsatiladi — oilaning asosiy a'zolari darhol ko'zga tashlanadi.",
            "Katta oilada faqat asosiy shaxslarning ismlari yorliqlanadi (qolganlari tugun ustiga borilganda chiqadi) — bu tartibsizlikni kamaytiradi.",
            "\"Avatarlar\" ko'rinishida rasmlar endi doiraviy bo'lib, silliqroq yuklanadi: rasm kelguncha bosh harf ko'rinadi, rasm bo'lmaganda ham chiroyli chiqadi.",
        ],
        fixes: [],
    },
    {
        version: '1.6.5',
        date: '2026-06-09 22:10',
        title: "3D shajara ko'rinishi professional fonga ega bo'ldi",
        features: [],
        fixes: [
            "3D shajara ko'rinishi (\"Oila a'zolari\" → \"Daraxti\" → \"3D\") fonidagi yorqin ko'k rang muammosi tuzatildi — bunda shaxslar, oilaviy bog'lanishlar va ism yorliqlari fonda ko'rinmay qolardi. Endi shajara chuqur kosmik (deep-space) fonda ko'rsatiladi: shaxslar yorqin porlab ajraladi, ulanishlar va ismlar aniq o'qiladi. Qo'shimcha nozik chuqurlik effekti (vignette) markazni fokuslab, professional ko'rinish beradi.",
        ],
    },
    {
        version: '1.6.4',
        date: '2026-06-08 05:02',
        title: "Xonadonlar ko'rinishida endi butun shajara ko'rinadi",
        features: [],
        fixes: [
            "\"Oila a'zolari\" sahifasidagi \"Xonadonlar\" ko'rinishi endi butun oila shajarasini ko'rsatadi — ota-ona, bobo-buvi, aka-uka va farzandlarning xonadonlari, ular boshqa urug'da bo'lsa ham. Ilgari faqat o'zingiz a'zo bo'lgan urug'dagi xonadonlar ko'rinardi, shu sababli, masalan, ota-onangizning oilasi \"Xonadonlar\" ko'rinishida chiqmas edi (\"Shaxslar\" daraxtida esa ko'rinardi). Endi ikkala ko'rinish bir xil oilani ko'rsatadi.",
        ],
    },
    {
        version: '1.6.3',
        date: '2026-06-06 23:09',
        title: "Uzoq tanaffusdan keyin tizimga qayta kirish muammosi tuzatildi",
        features: [],
        fixes: [
            "Ilovani tizimga kirgan holda yopib, bir muncha vaqtdan keyin (taxminan bir soatdan oshiq) qaytadan ochganda bosh sahifa yuklanmay, \"Ma'lumotlarni yuklashda xatolik\" va \"Avtorizatsiya talab qilinadi\" xabarlari takror chiqib qolardi — endi tizim sessiyani avtomatik yangilab, normal ishlashda davom etadi.",
        ],
    },
    {
        version: '1.6.2',
        date: '2026-06-05 02:25',
        title: "Oila daraxti oynalari va xatoliklari izchilligi",
        features: [],
        fixes: [
            "Oila daraxti amallarida (tahrirlash, o'chirish, partner qo'shish) xatolik yuz bersa, endi aniq sabab ko'rsatiladi — ilgari ba'zi amallarda umumiy \"xatolik\" xabari chiqardi.",
            "Turmush o'rtoq, farzand va ota-ona qo'shish oynalaridagi \"yangi yoki mavjud shaxs\" tanlash yagona, izchil ko'rinishga keltirildi.",
            "Nikoh ma'lumotlarini tahrirlashda ajrashgan sana nikoh sanasidan oldin bo'lsa, ogohlantirish chiqadi.",
        ],
    },
    {
        version: '1.6.1',
        date: '2026-06-05 00:30',
        title: "Ota-ona qo'shish va o'chirish barqarorligi yaxshilandi",
        features: [],
        fixes: [
            "Shajara daraxtida farzandning ota-onasini o'chirgandan so'ng, o'sha farzandga qaytadan ota-ona qo'shish endi ishlaydi — ilgari \"Bu shaxs allaqachon biologik farzand sifatida boshqa oila birligiga biriktirilgan\" xatosi chiqib, qayta kiritishga to'sqinlik qilardi.",
            "Ota-onadan faqat bittasi o'chirilgan bo'lsa (masalan ota), \"Ota-ona qo'shish\" oynasi endi tirik qolgan ota yoki onani avtomatik ko'rsatadi va faqat yetishmayotganini so'raydi — u o'sha mavjud nikohga qo'shiladi, yangi nikoh yaratilmaydi.",
            "Oila a'zosi o'chirilganda uning nikoh va farzandlik bog'lanishlari to'g'ri tozalanadi — ortda yetim (ko'rinmas) bog'lanish qolmaydi, shu sababli shajara daraxti va keyingi amallar izchil ishlaydi.",
        ],
    },
    {
        version: '1.6.0',
        date: '2026-06-04 12:30',
        title: "Yangi mobil dizayn va rebrend",
        features: [
            "Butunlay yangilangan mobil interfeys — zamonaviy, ixcham va native ilova hissi. Telefonda foydalanish sezilarli darajada qulaylashdi.",
            "Yangi brend belgisi (logotip) va yagona rang uslubi: barcha ekranlarda teal–emerald gradient.",
            "Pastki navigatsiya markazida tezkor tranzaksiya qo'shish uchun katta '+' tugmasi; qolgan barcha bo'limlar ixcham \"Yana\" varag'ida.",
            "Bosh sahifada gradient balans kartasi: umumiy balans, bu oygi daromad va xarajat hamda balansni bir bosishda yashirish imkoniyati.",
            "Bosh sahifada tezkor amallar qatori: Xarajat, Daromad, Hisoblar va Hisobot.",
            "Tranzaksiyalar, Hisoblar, Byudjet, Jamg'arma va Qarzlar sahifalari mobil uchun qayta ishlandi: ixcham bank-uslubidagi kartalar, \"pill\" ko'rinishidagi tablar va kamroq bo'sh joy.",
            "Hisoblar mobilda endi ixcham ro'yxat ko'rinishida (avvalgi katta kartalar o'rniga).",
            "Qarzlar mobilda: berilgan/olingan qisqacha summasi yuqorida, qarz tafsilotlari esa qulay pastki varaqda (modal) ochiladi.",
            "Yangilangan kirish (login) ekrani — toza markazlashgan dizayn va demo hisoblarni bosib to'ldirish.",
            "Telefon \"notch\" va pastki indikatori uchun xavfsiz hudud qo'llab-quvvatlashi (kelajakdagi APK uchun tayyor).",
        ],
        fixes: [],
    },
    {
        version: '1.5.1',
        date: '2026-06-01 22:30',
        title: "Har bir oila alohida xonadon raqamiga ega bo'ldi",
        features: [],
        fixes: [
            "Har bir oila (nikoh) endi o'zining alohida xonadon raqamiga ega bo'ladi — ilgari bir vaqtda yaratilgan bir nechta oila bir xil raqamni (masalan \"055-330\") baham ko'rardi.",
            "Bir raqamga to'planib qolgan mavjud oilalar avtomatik ravishda alohida xonadonlarga ajratildi (har biri o'z raqamini oldi).",
        ]
    },
    {
        version: '1.5.0',
        date: '2026-06-01 21:30',
        title: "Login va parol boshqaruvi yaxshilandi",
        features: [
            "Oila a'zosiga login ochishda endi login (username) ni qo'lda kiritish mumkin — bo'sh qoldirilsa ism asosida avtomatik yaratiladi. Yozilganda login band emasligi darhol tekshiriladi.",
            "Barcha parol maydonlari uchun yagona qulay komponent: parolni ko'rsatish/yashirish, bir bosishda kuchli parol generatsiya qilish va parol kuchi ko'rsatkichi.",
        ],
        fixes: [
            "Oila a'zosiga login ochilgandan so'ng, u o'sha login bilan kirganda endi o'z oilasi a'zolarini ko'radi (ilgari yangi foydalanuvchiga alohida bo'sh \"urug'\" yaratilib qolib, oila a'zolari ko'rinmay qolardi).",
            "Shu xato tufayli ilgari noto'g'ri scope'ga tushib qolgan loginlar keyingi kirishda avtomatik o'z oilasiga qayta ulanadi.",
            "Parolga qo'yiladigan talablar butun ilovada bir xil bo'ldi (ilgari turli sahifalarda turlicha edi).",
        ]
    },
    {
        version: '1.4.5',
        date: '2026-06-01 04:00',
        title: "Turmush o'rtoq mavjud oilaga qo'shiladi",
        features: [],
        fixes: [
            "Yagona ota-ona sifatida farzand qo'shilgan oilaga keyin turmush o'rtoq qo'shilsa, endi turmush o'rtoq O'SHA nikohga qo'shiladi (ilgari alohida nikoh yaratilib, farzand shajara daraxtida ko'rinmay qolardi)."
        ]
    },
    {
        version: '1.4.4',
        date: '2026-06-01 03:42',
        title: "Ota-ona qo'shish endi atomik",
        features: [],
        fixes: [
            "\"Ota-ona qo'shish\" endi bitta amalda (atomik) bajariladi — farzandning biologik ota-onasi allaqachon bo'lsa yoki boshqa xato chiqsa, bo'sh nikoh yoki yetim shaxslar yaratilib qolmaydi (ilgari ota, ona, nikoh yaratilib, so'ng xato chiqib, ular osilib qolardi)."
        ]
    },
    {
        version: '1.4.3',
        date: '2026-06-01 03:18',
        title: "O'chirilgan turmush o'rtoq izchil yashiriladi",
        features: [],
        fixes: [
            "O'chirilgan (nofaol) turmush o'rtoq yoki farzand endi hech qaerda ko'rinmaydi — \"Oilani tanlang\" oynasi, xonadon va daraxt ko'rinishlari izchil bo'ldi (avval \"Oilani tanlang\"da o'chirilgan turmush o'rtoq ismi chiqardi).",
            "Turmush o'rtoqsiz nikoh \"Oilani tanlang\"da \"Yagona ota-ona\" deb ko'rsatiladi."
        ]
    },
    {
        version: '1.4.2',
        date: '2026-06-01 02:40',
        title: "Yagona ota-ona orqali farzand qo'shish tuzatildi",
        features: [],
        fixes: [
            "\"Yagona ota-ona\" tanlab farzand qo'shishda endi nikoh faqat farzand saqlanganda yaratiladi — ilgari farzand saqlanmasa ham bo'sh nikoh qolib, keyingi safar \"turmush o'rtoq / yagona ota-ona\" tanlovi o'tkazib yuborilardi."
        ]
    },
    {
        version: '1.4.1',
        date: '2026-06-01 02:15',
        title: "Xonadon ko'rinishi: yangi a'zolar avtomatik bog'lanadi",
        features: [],
        fixes: [
            "Yangi ro'yxatdan o'tgan foydalanuvchi, qo'shilgan oila a'zosi va yaratilgan nikoh endi avtomatik xonadonga bog'lanadi — \"Xonadonlar\" ko'rinishida darhol paydo bo'ladi (ilgari scope bog'lanmagani uchun ko'rinmasdi).",
            "Yangi xonadonlarga avtomatik raqam (masalan \"278-541\") beriladi.",
            "Xonadon hali bo'lmaganda tushunarli ko'rsatma va \"Shaxslar\" ko'rinishiga o'tish tugmasi qo'shildi."
        ]
    },
    {
        version: '1.4.0',
        date: '2026-05-31 05:15',
        title: "Xonadon-markazli oila shajarasi",
        features: [
            "Oila a'zolari → \"Daraxti\" sahifasiga yangi \"Xonadonlar\" ko'rinishi qo'shildi: har bir xonadon alohida quti bo'lib, ichida ota-ona va farzandlar birga ko'rsatiladi.",
            "\"Shaxslar\" va \"Xonadonlar\" ko'rinishlari orasida bitta tugma bilan almashtirish mumkin.",
            "Xonadonlar bir-biriga farzandlar orqali bog'lanadi: bir xonadonda farzand bo'lgan kishi turmush qurib boshqa xonadonda ota/ona bo'lgani avtomatik strelka bilan ko'rsatiladi.",
            "Xonadon qutisini bosib bevosita o'sha xonadonning moliyaviy bo'limiga (byudjet/hisoblar) o'tish imkoniyati qo'shildi.",
            "Har bir xonadonga inson o'qiy oladigan qisqa raqam (masalan \"278-541\") biriktirildi."
        ],
        fixes: [
            "Nikohi yo'q shaxsga farzand qo'shish oynasi qulayroq qilindi: \"Turmush o'rtoq qo'shish\" va \"Yagona ota-ona\" variantlari endi aniq tanlov kartalari ko'rinishida, izohlari bilan ko'rsatiladi."
        ]
    },
    {
        version: '1.3.4',
        date: '2026-02-26 04:30',
        title: "Banklar katalogi va karta-bank integratsiyasi",
        features: [
            "Sozlamalarda yangi \"Banklar\" sahifasi qo'shildi: bank yaratish, tahrirlash, qidirish va faol/nofaol holatini boshqarish mumkin.",
            "Banklar uchun BIN prefikslarini saqlash tizimi joriy etildi va karta raqami (BIN) orqali mos bankni avtomatik aniqlash qo'shildi.",
            "Hisob (Account) yaratish formasida bank tanlash imkoniyati kengaytirildi: bank ro'yxati backenddan olinadi va bank ma'lumotlari avtomatik to'ldiriladi.",
            "Bank kartasi qo'shish interfeysi alohida `CreditCardInput` komponentiga ajratildi: karta preview, turini aniqlash, Luhn tekshiruvi va virtual/plastik rejimlar yaxshilandi.",
            "Backendda banklar uchun alohida API va ma'lumotlar bazasi jadvallari (`banks`, `bank_bins`) hamda `accounts.bank_id` bog'lanishi qo'shildi."
        ],
        fixes: [
            "Hisob obyektlarida bank ma'lumoti endi barqarorroq uzatiladi: `bankId` va `bankLogoUrl` javobga qo'shildi."
        ]
    },
    {
        version: '1.3.3',
        date: '2026-02-26 03:00',
        title: "Bank kartalari interfeysi va funksionalligi",
        features: [
            "Karta kiritish maydonida Karta turini avtomatik aniqlash o'rnatildi (HUMO, UZCARD, UZCARD COBADGE, VISA, MASTERCARD, UNIONPAY).",
            "Karta raqami yozilayotganda 4 ta raqamdan so'ng joy tashlash (probel bilan formatlash) avtomatlashtirildi.",
            "Luhn algoritmi yordamida kiritilgan 16 xonali karta raqamining aslligi haqiqiy vaqt rejimida tekshiriladigan bo'ldi.",
            "Aniqlangan karta turlari uchun kichik ko'rkam nishonlar (badge) qo'shildi.",
            "Kartani saqlashda \"Plastik karta\" va \"Virtual karta\" qilib belgilash imkoniyati joriy etildi."
        ],
        fixes: [
            "Yangi bank hisobi ochilayotganda biriktirilgan karta ma'lumotlari haqiqatda tizim bazasiga (cards table) yozib olinmayotgan xato tuzatildi."
        ]
    },
    {
        version: '1.3.2',
        date: '2026-02-26 02:00',
        title: "Xo'jalik manzili va noyob raqam",
        features: [
            "Oila guruhining 'Unique Code' (Noyob raqam) xususiyati yaratildi. U guruh nomi yonida doimiy ko'rinib turadigan 6 xonali kod shaklida interfeysga qo'shildi.",
            "Yashash manzili kiritish amaliyoti takomillashtirildi. Endi joriy manzilni saqlash va ko'chib o'tilganda yangi manzilni kiritish mumkin.",
            "Barcha kiritilgan manzillarning tarixi (qachon kelinganligi/ketganligi) alohida xronologik tartibda tizimda saqlanadi va ko'rsatiladi."
        ],
        fixes: [
            "Oilaviy bo'lmagan hisob-kitob varaqalarida 'duplicate key value violates unique constraint accounts_acc_code_key' ma'lumotlar bazasi xatoligi avtomat tarzda bartaraf etildi."
        ]
    },
    {
        version: '1.3.1',
        date: '2026-02-25 22:30',
        title: "Rol yaratish modali yaxshilandi",
        features: [
            "Rol yaratish va tahrirlash modalidagi placeholder matnlari oilaviy moliya kontekstiga moslashtirildi (masalan: \"Buxgalter\", \"ACCOUNTANT\").",
            "Belgilangan ruxsatlar (permissions) vizual jihatdan ajralib turadigan qilindi — tanlangan elementlar rang, chegara va shrift bilan boshqalardan farqlanadi."
        ],
        fixes: []
    },
    {
        version: '1.3.0',
        date: '2026-02-25 20:00',
        title: "Foydalanuvchi username (login) o'zgartirish",
        features: [
            "Admin endi foydalanuvchining username (login)ini to'g'ridan-to'g'ri boshqaruv panelidan o'zgartira oladi.",
            "Real-time tekshirish: username yozilayotganda uning bandligi yoki bo'shligi serverdan avtomatik tekshiriladi (debounced).",
            "2 bosqichli tasdiqlash oqimi: avval yangi username kiritiladi, keyin ogohlantirish bilan tasdiqlanadi.",
            "Xavfsizlik: username o'zgartirilganda foydalanuvchining barcha faol sessiyalari avtomatik tugatiladi — qayta login talab qilinadi.",
            "Taqiqlangan username'lar (admin, root, system, test va h.k.) server tomonida bloklanadi.",
            "Username formati: faqat kichik lotin harflari, raqamlar, nuqta va pastki chiziq, harf bilan boshlanishi shart."
        ],
        fixes: []
    },
    {
        version: '1.2.9',
        date: '2026-02-25 18:00',
        title: "Admin panel: Foydalanuvchilarni boshqarish sahifasi",
        features: [
            "Yangi \"Foydalanuvchilar\" admin sahifasi qo'shildi — barcha foydalanuvchilarni ro'yxatda ko'rish, qidirish va filtr qilish imkoniyati.",
            "Har bir foydalanuvchini tahrirlash (ism, email, telefon), parolini tiklash, faollashtirish/o'chirish mumkin.",
            "Foydalanuvchiga rol biriktirish va olib tashlash funksiyasi qo'shildi.",
            "Foydalanuvchilar ro'yxatini Excel va PDF formatida eksport qilish imkoniyati.",
            "Barcha amallar permission (ruxsat) tizimi orqali himoyalangan."
        ],
        fixes: [
            "FamilyGroupSettings sahifasidagi TypeScript `any` tiplari to'g'ri tiplar bilan almashtirildi.",
            "ESLint CI tekshiruvida chiqayotgan xatoliklar bartaraf etildi."
        ]
    },
    {
        version: '1.2.8',
        date: '2026-02-24 12:00',
        title: "Xo'jalik sahifasida a'zolarni boshqarish",
        features: [
            "\"Mening oilam\" sahifasida to'g'ridan-to'g'ri a'zo qo'shish imkoniyati qo'shildi — endi /settings sahifasiga o'tish shart emas.",
            "A'zo kartochkasiga hover qilganda qizil o'chirish tugmasi paydo bo'ladi (faqat admin uchun).",
            "O'chirishdan oldin tasdiqlash modali chiqadi — tasodifiy o'chirishning oldi olinadi.",
        ],
        fixes: [
            "A'zoni guruhdan o'chirishda \"Foydalanuvchi topilmadi\" xatoligi tuzatildi — backend endi FamilyMember ID bilan ishlaydi.",
        ]
    },
    {
        version: '1.2.7',
        date: '2026-02-23 14:01',
        title: "Oilaviy xo'jalik a'zolari kartasi layout barqarorligi",
        features: [],
        fixes: [
            "Oilaviy xo'jalik boshqaruvi sahifasida telefoni yo'q a'zolar kartalarida ham telefon qatori uchun bo'sh joy saqlanadigan qilindi.",
            "Natijada 'Daromad' va 'Xarajat' badge bloklari kartalar orasida yuqoriga/pastga siljimasdan bir xil tekislikda ko'rinadi."
        ]
    },
    {
        version: '1.2.6',
        date: '2026-02-22 23:21',
        title: "Ro'yxat tabida Auto pagination optimizatsiyasi",
        features: [
            "Oila a'zolari sahifasidagi Ro'yxat tabida `Auto` pagination endi jadval uchun ajratilgan real oynaga mos ravishda qatorlar sonini avtomatik tanlaydi.",
            "Jadval sarlavhasi va qator balandligi DOM'dan real vaqt rejimida o'lchanadi, shuning uchun turli ekran o'lchamlari va resize holatlarida natija barqaror."
        ],
        fixes: [
            "Auto rejimda jadval ichida keraksiz vertikal scroll chiqib qolishi muammosi bartaraf etildi.",
            "So'nggi qatordan keyin bo'sh joy qolib ketishi holati tuzatildi."
        ]
    },
    {
        version: '1.2.5',
        date: '2026-02-22 15:47',
        title: "Oila a'zolari ro'yxati yangilandi",
        features: [
            "Ro'yxat ko'rinishi karta shaklidan professional jadval shaklida o'zgartirildi — bir ko'rishda ko'proq ma'lumot ko'rinadi.",
            "Har bir a'zo uchun yoshi va tug'ilgan yili, tug'ilgan joyi, telefon raqami yangi ustunlarda chiroyli tarzda ko'rsatiladi.",
            "Tizim foydalanuvchisi bilan bog'liq a'zolar alohida yashil 'Tizimda' belgisi bilan ko'rsatilmoqda.",
            "O'zingizning profilingiz 'Sen' belgisi bilan ajralib turadi.",
            "Sahifalash (pagination) bilan ishlash endi qulay — rekordlar soni va sahifalar ko'rsatiladi.",
            "Ro'yxatda rasm yuklash (crop + ImgBB) funksiyasi ham qo'shildi."
        ],
        fixes: [
            "Modal sarlavhasidagi va 'Saqlash' tugmasidagi qo'shimcha qo'shtirnoqlar olib tashlandi."
        ]
    },
    {
        version: '1.2.4',
        date: '2026-02-22 15:22',
        title: "Rasm yuklash va tahrirlash tizimi",
        features: [
            "Profilga rasm qo'shish uchun yangi professional vosita qo'shildi. Endi rasmni qurilmangizdan to'g'ridan-to'g'ri ilovaga yuklash mumkin.",
            "Yuklashdan oldin rasmni kerakli qismini kesish (crop), masshtablash (zoom) va aylantirish (rotate) imkoniyati qo'shildi.",
            "ImgBB bulut xizmatiga avtomatik yuklash amalga oshirildi, shuning uchun endi tashqi havolalarni qo'lda izlash shart emas.",
            "Havola (URL) orqali rasm qo'shish imkoniyati ham saqlab qolindi."
        ],
        fixes: []
    },
    {
        version: '1.2.3',
        date: '2026-02-22 14:48',
        title: "Shajara (Family Tree) interfeysidagi takomillashuvlar",
        features: [
            "Oila a'zosi ustiga bosganda chiqadigan yon oynada (Sidebar) ism-familiyalar ko'rinishi yangilandi. Endi ularni bosish mumkinligi aniqroq (hover) va to'liq ism-sharif kursorni ustiga olib borganda ko'rinadi (tooltip).",
            "Farzandlar ro'yxatida 'Biologik' yozuvi o'rniga ularning yoshi va tug'ilgan yili professional shaklda aks ettirildi."
        ],
        fixes: []
    },
    {
        version: '1.2.2',
        date: '2026-02-22 14:34',
        title: "Xavfsizlik va ma'lumotlar butunligi",
        features: [
            "Foydalanuvchi hisobini yaratish funksiyasi endi a'zoni tahrirlash (Edit Member) darchasiga ko'chirildi."
        ],
        fixes: [
            "Oila a'zolari ro'yxatidan 'Yangi a'zo' qo'shish tugmasi olib tashlanib, etim (shajaraga ulanmagan) ma'lumotlar tug'ilishi mutlaq to'xtatildi.",
            "Backend tizimida Oila guruhlari (FamilyGroup) bo'yicha qat'iy ma'lumotlar xavfsizligi o'rnatildi, barcha so'rovlar chegaralandi."
        ]
    },
    {
        version: '1.2.1',
        date: '2026-02-22 12:45',
        title: "Daraxtda yuklanish holati va UX yaxshilanishlari",
        features: [
            'Shajarada ma\'lumotlar tarmoqlangan tugunlarni ochishda endi qotib qolish o\'rniga professional aylanuvchi yuklanish (Loading indicator) belgisi ko\'rinadigan bo\'ldi.'
        ],
        fixes: []
    },
    {
        version: '1.2.0',
        date: '2026-02-22 10:30',
        title: 'Oilaviy guruhlar va tizimli o\'zgarishlar',
        features: [
            'Yangi "Oilaviy guruhlar" (Family Groups) tizimi qo\'shildi. Endi siz oila a\'zolaringizni guruhga taklif qilishingiz va ularga Administrator yoki Foydalanuvchi huquqlarini berishingiz mumkin.',
            '"Sozlamalar" sahifasida maxsus Oila guruhini boshqarish bo\'limi yaratildi.',
            'Shajara (Family Tree) ga yangi odam qo\'shish yoki tahrirlash darchalarida zamonaviy qidiruv tizimiga ega "Shaxsni tanlash" (PersonSelect) komponenti joriy etildi.',
            'Shajara grafik dizayni to\'liq yangilanib, qarindoshlar qatorlari chigallashib ketmasligini ta\'minlaydigan maxsus algoritmga o\'tildi.'
        ],
        fixes: [
            'Oilaviy moliya tahlilida hisob ko\'rinishidagi ruxsatnomalar (AccountScope) ga tegishli global ma\'lumotlar sizib chiqish xavfsizlik teshigi yopildi.',
            'Shajarani ko\'rishda bir xil jinsli shaxslar ma\'lumotlari kiritilganda tizim ishlamay qolishining (Crash) oldi olindi.',
            'Shajarada markazga diqqatni jalb qilishda sakrashlar jilo bilan silliq ishlashiga moslashtirildi.'
        ]
    },
    {
        version: '1.1.0',
        date: '2025',
        title: 'Dastlabki versiya',
        features: [
            'Tranzaksiyalarni boshqarish',
            'Hisoblar tizimi',
            'Kategoriyalar filtri',
            'Byudjetni rejalashtirish',
            'Oilaviy shajara tizimi beta talqinda'
        ],
        fixes: []
    }
];

// Helper for localstorage semantic versioning comparisons
export const LATEST_VERSION = changelogData[0].version;
