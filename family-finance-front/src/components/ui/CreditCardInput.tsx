import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import { CreditCard, Nfc } from 'lucide-react';
import { banksApi, type Bank } from '../../api/banks.api';

interface CreditCardInputProps {
    cardNumber: string;
    cardHolderName: string;
    cardExpiryDate: string;
    cardType: string;
    isVirtual: boolean;
    onCardNumberChange: (val: string, type: string, detectedBank: Bank | null) => void;
    onCardHolderNameChange: (val: string) => void;
    onCardExpiryDateChange: (val: string) => void;
    onIsVirtualChange: (val: boolean) => void;
}

export function CreditCardInput({
    cardNumber,
    cardHolderName,
    cardExpiryDate,
    cardType,
    isVirtual,
    onCardNumberChange,
    onCardHolderNameChange,
    onCardExpiryDateChange,
    onIsVirtualChange,
}: CreditCardInputProps) {

    const [localBank, setLocalBank] = useState<Bank | null>(null);

    // Auto-detect bank via API when card number is entered (debounced or strictly monitored)
    const cleanNumber = cardNumber.replace(/\D/g, '');

    useEffect(() => {
        let active = true;

        // faqat kamida 6 xona terilganda izlaymiz (BIN uzunligi)
        if (cleanNumber.length >= 6) {
            banksApi.resolveByCardNumber(cleanNumber)
                .then(response => {
                    if (active && response.data) {
                        setLocalBank(response.data);
                        // Inform parent about the detected bank so they can update the Select dropdown
                        onCardNumberChange(cardNumber, cardType, response.data);
                    } else if (active && !response.data) {
                        setLocalBank(null);
                        onCardNumberChange(cardNumber, cardType, null);
                    }
                })
                .catch(err => {
                    console.error("Bankni aniqlashda xatolik:", err);
                    if (active) setLocalBank(null);
                });
        } else {
            setLocalBank(null);
        }

        return () => { active = false; };
    }, [cleanNumber.substring(0, 6)]); // faqat dastlabki 6 tasi o'zgarganda ishlaydi

    // Helper detectCardType as before
    const detectCardType = (number: string): string => {
        const clean = number.replace(/\s+/g, '');
        if (clean.startsWith('9860')) return 'HUMO';
        if (clean.startsWith('8600')) return 'UZCARD';
        if (clean.startsWith('5614') || clean.startsWith('6262')) return 'UZCARD_COBADGE';
        if (clean.startsWith('4')) return 'VISA';
        if (/^5[1-5]/.test(clean)) return 'MASTERCARD';
        if (clean.startsWith('62')) return 'UNIONPAY';
        return '';
    };

    const formatCardNumber = (val: string) => {
        const clean = val.replace(/\D/g, '').substring(0, 16);
        const matches = clean.match(/.{1,4}/g);
        return matches ? matches.join(' ') : clean;
    };

    const isValidLuhn = (val: string) => {
        const clean = val.replace(/\D/g, '');
        if (clean.length !== 16) return true;
        let sum = 0;
        let isSecond = false;
        for (let i = clean.length - 1; i >= 0; i--) {
            let d = parseInt(clean[i], 10);
            if (isSecond) {
                d *= 2;
                if (d > 9) d -= 9;
            }
            sum += d;
            isSecond = !isSecond;
        }
        return sum % 10 === 0;
    };

    const handleChangeNumber = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        const formatted = formatCardNumber(val);
        const type = detectCardType(formatted);
        onCardNumberChange(formatted, type, localBank);
    };

    // UI Theme based on card
    let cardBgClass = "from-slate-700 to-slate-900 text-white";
    if (cardType === 'HUMO') cardBgClass = "from-orange-500 to-orange-700 text-white";
    else if (cardType === 'UZCARD') cardBgClass = "from-blue-600 to-blue-800 text-white";
    else if (cardType === 'UZCARD_COBADGE') cardBgClass = "from-cyan-600 to-blue-900 text-white";
    else if (cardType === 'VISA') cardBgClass = "from-indigo-600 to-purple-800 text-white";
    else if (cardType === 'MASTERCARD') cardBgClass = "from-red-600 to-orange-600 text-white";
    else if (cardType === 'UNIONPAY') cardBgClass = "from-red-700 to-red-900 text-white";

    return (
        <div className="flex flex-col gap-6 w-full">
            {/* 3D Card Preview */}
            <div className="relative mx-auto w-full max-w-[340px] h-[210px] rounded-2xl shadow-xl overflow-hidden transition-all duration-500 group perspective-1000">
                <div className={clsx(
                    "absolute inset-0 bg-gradient-to-br p-5 flex flex-col justify-between transition-colors duration-500",
                    cardBgClass,
                    isVirtual ? "opacity-90 border border-dashed border-white/50" : "opacity-100"
                )}>
                    {/* Top row */}
                    <div className="flex justify-between items-start w-full">
                        <div className="flex flex-col gap-1">
                            {localBank?.logoUrl ? (
                                <div className="h-8 max-w-[120px] bg-white/20 p-1 rounded backdrop-blur-sm flex items-center justify-center">
                                    <img src={localBank.logoUrl} alt="bank" className="h-full object-contain" />
                                </div>
                            ) : localBank?.name ? (
                                <span className="font-bold text-sm tracking-wide shadow-sm">{localBank.name}</span>
                            ) : (
                                <span className="font-semibold text-xs opacity-60 italic tracking-widest">BANK NOMI</span>
                            )}
                            <Nfc className="h-6 w-6 mt-2 opacity-70" />
                        </div>

                        <div className="flex flex-col items-end gap-1">
                            <span className="text-[10px] font-medium tracking-widest uppercase opacity-70">
                                {isVirtual ? "VIRTUAL KARTA" : "PLASTIK KARTA"}
                            </span>
                            {/* Brand Logo Corner */}
                            {cardType === 'VISA' && <span className="text-2xl font-bold italic tracking-tighter">VISA</span>}
                            {cardType === 'MASTERCARD' && (
                                <div className="flex -space-x-2 mt-1">
                                    <div className="w-8 h-8 rounded-full bg-red-500 opacity-90" />
                                    <div className="w-8 h-8 rounded-full bg-yellow-500 opacity-90 mix-blend-screen" />
                                </div>
                            )}
                            {cardType === 'HUMO' && <span className="text-xl font-bold tracking-wider mt-1">HUMO</span>}
                            {cardType === 'UZCARD' && <span className="text-lg font-bold tracking-wider mt-1">UZCARD</span>}
                            {cardType === 'UZCARD_COBADGE' && <span className="text-sm font-bold tracking-tight mt-1">UZCARD COBADGE</span>}
                            {cardType === 'UNIONPAY' && <span className="text-lg font-bold tracking-tight mt-1 text-white border-2 border-white px-1 ml-2 bg-red-600/80 rounded block">UnionPay</span>}
                            {!cardType && <CreditCard className="h-8 w-8 opacity-50" />}
                        </div>
                    </div>

                    {/* Middle row: Card Number */}
                    <div className="mt-4 w-full">
                        <div className="font-mono text-2xl tracking-[0.2em] font-medium text-shadow-sm min-h-[32px] w-full flex">
                            {cardNumber ? cardNumber : <span className="opacity-30">XXXX XXXX XXXX XXXX</span>}
                        </div>
                    </div>

                    {/* Bottom row: Holder & Expiry */}
                    <div className="flex justify-between items-end w-full">
                        <div className="flex flex-col uppercase max-w-[70%]">
                            <span className="text-[9px] opacity-60 tracking-widest mb-0.5">Karta egasi</span>
                            <span className="font-mono text-sm tracking-wider truncate">
                                {cardHolderName || <span className="opacity-30">ISM FAMILIYA</span>}
                            </span>
                        </div>
                        <div className="flex flex-col uppercase items-end">
                            <span className="text-[9px] opacity-60 tracking-widest mb-0.5">Amal qilish</span>
                            <span className="font-mono text-base tracking-widest">
                                {cardExpiryDate || <span className="opacity-30">MM/YY</span>}
                            </span>
                        </div>
                    </div>

                    {/* Glassmorphism reflection overlay */}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/20 rounded-2xl" />
                </div>
            </div>

            {/* Inputs Form Section */}
            <div className="space-y-4">
                <div className="form-control">
                    <label className="label py-1">
                        <span className="label-text text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                            Karta raqami *
                        </span>
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            className={clsx(
                                'input input-bordered w-full font-mono text-lg tracking-widest transition-colors',
                                !isValidLuhn(cardNumber) && cardNumber.replace(/\s/g, '').length === 16 && 'input-error focus:border-error focus:ring-error',
                                isValidLuhn(cardNumber) && cardNumber.replace(/\s/g, '').length === 16 && 'input-success focus:border-success focus:ring-success'
                            )}
                            placeholder="0000 0000 0000 0000"
                            value={cardNumber}
                            onChange={handleChangeNumber}
                            maxLength={19}
                        />
                    </div>
                    {!isValidLuhn(cardNumber) && cardNumber.replace(/\s/g, '').length === 16 && (
                        <p className="text-xs text-error mt-1.5 font-medium ml-1">Luhn algoritmi: Karta raqami xato kiritilgan</p>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="form-control">
                        <label className="label py-1">
                            <span className="label-text text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                                Karta egasi (Ism)
                            </span>
                        </label>
                        <input
                            type="text"
                            className="input input-bordered w-full uppercase"
                            placeholder="ALISHER VOHIDOV"
                            value={cardHolderName}
                            onChange={(e) => onCardHolderNameChange(e.target.value.toUpperCase())}
                        />
                    </div>
                    <div className="form-control">
                        <label className="label py-1">
                            <span className="label-text text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                                Amal qilish (MM/YY)
                            </span>
                        </label>
                        <input
                            type="text"
                            className="input input-bordered w-full font-mono"
                            placeholder="12/26"
                            value={cardExpiryDate}
                            onChange={(e) => {
                                let val = e.target.value.replace(/\D/g, '');
                                if (val.length > 2) val = val.substring(0, 2) + '/' + val.substring(2, 4);
                                onCardExpiryDateChange(val);
                            }}
                            maxLength={5}
                        />
                    </div>
                </div>

                <div className="form-control pt-2">
                    <div className="flex p-1 bg-base-200/50 rounded-lg p-1 w-full max-w-sm mx-auto">
                        <button
                            type="button"
                            className={clsx(
                                "flex-1 text-sm font-medium py-2 rounded-md transition-all",
                                !isVirtual ? "bg-base-100 shadow-sm text-base-content" : "text-base-content/60 hover:text-base-content"
                            )}
                            onClick={() => onIsVirtualChange(false)}
                        >
                            Plastik karta
                        </button>
                        <button
                            type="button"
                            className={clsx(
                                "flex-1 text-sm font-medium py-2 rounded-md transition-all",
                                isVirtual ? "bg-base-100 shadow-sm text-base-content" : "text-base-content/60 hover:text-base-content"
                            )}
                            onClick={() => onIsVirtualChange(true)}
                        >
                            Virtual karta
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
