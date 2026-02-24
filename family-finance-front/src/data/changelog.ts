export interface ChangelogEntry {
    version: string;
    date: string;
    title: string;
    features: string[];
    fixes: string[];
}

export const changelogData: ChangelogEntry[] = [
    {
        version: '1.2.8',
        date: '2026-02-24 12:00',
        title: "Xo'jalik sahifasida a'zolarni boshqarish",
        features: [
            "\"Mening oilam\" sahifasida to'g'ridan-to'g'ri a'zo qo'shish imkoniyati qo'shildi — endi /settings sahifasiga o'tish shart emas.",
            "A'zo kartochkasiga hover qilganda qizil o'chirish tugmasi paydo bo'ladi (faqat admin uchun).",
            "O'chirishdan oldin tasdiqlash modali chiqadi — tasodifiy o'chirishning oldi olinadi.",
        ],
        fixes: []
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
