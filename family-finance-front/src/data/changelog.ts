export interface ChangelogEntry {
    version: string;
    date: string;
    title: string;
    features: string[];
    fixes: string[];
}

export const changelogData: ChangelogEntry[] = [
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
