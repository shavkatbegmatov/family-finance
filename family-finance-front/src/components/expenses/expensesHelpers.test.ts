import { describe, expect, it } from 'vitest';

import { expenseAmountForCategory } from './expensesHelpers';

/**
 * Kategoriya filtri faol bo'lganda split'li tranzaksiya summasi qanday
 * ko'rsatilishini qulflaydi: backend filtri (findWithFilters EXISTS bilan)
 * split-parent'ni qaytaradi, front esa TO'LIQ summani emas, tegishli ulushni
 * ko'rsatishi kerak — aks holda kun jami kategoriya taqsimotiga mos kelmaydi.
 */
describe('expenseAmountForCategory', () => {
  const splits = [
    { categoryId: 1, amount: 30000 },
    { categoryId: 2, amount: 20000 },
  ];

  it("filtrsiz har doim to'liq summa", () => {
    expect(expenseAmountForCategory({ amount: 50000, splits }, undefined)).toBe(50000);
  });

  it("split'siz tranzaksiyada filtr bilan ham to'liq summa", () => {
    expect(expenseAmountForCategory({ amount: 15000 }, 1)).toBe(15000);
    expect(expenseAmountForCategory({ amount: 15000, splits: [] }, 1)).toBe(15000);
    expect(expenseAmountForCategory({ amount: 15000, splits: null }, 1)).toBe(15000);
  });

  it('filtr kategoriyasiga tegishli ulush qaytadi', () => {
    expect(expenseAmountForCategory({ amount: 50000, splits }, 1)).toBe(30000);
    expect(expenseAmountForCategory({ amount: 50000, splits }, 2)).toBe(20000);
  });

  it("bir kategoriyada bir nechta ulush bo'lsa yig'indisi", () => {
    const multi = [
      { categoryId: 1, amount: 10000 },
      { categoryId: 1, amount: 5000 },
      { categoryId: 2, amount: 35000 },
    ];
    expect(expenseAmountForCategory({ amount: 50000, splits: multi }, 1)).toBe(15000);
  });

  it("ulush topilmasa to'liq summa qoladi (to'g'ridan kategoriya mosligi holati)", () => {
    expect(expenseAmountForCategory({ amount: 50000, splits }, 99)).toBe(50000);
  });
});
