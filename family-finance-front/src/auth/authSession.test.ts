import { describe, expect, it, vi } from 'vitest';
import {
  createAuthSession,
  readJwtExpiryMs,
  type AuthChannel,
  type AuthMessage,
  type AuthSessionPlatform,
  type RefreshResult,
} from './authSession';
import { createTokenStore } from './tokenStore';

const HOUR_MS = 3_600_000;
const NOW = 1_800_000_000_000;

/** Soxta JWT: faqat `exp` (soniya) — imzo tekshirilmaydi. */
function jwt(expMs: number, id = 'x'): string {
  return `h.${btoa(JSON.stringify({ exp: Math.floor(expMs / 1000), id }))}.s`;
}

/** BroadcastChannel'ning bir jarayondagi soxta nusxasi: xabar boshqa "tab"larga async yetadi. */
class FakeBus {
  private readonly channels = new Set<FakeChannel>();

  join(channel: FakeChannel) {
    this.channels.add(channel);
  }

  broadcast(from: FakeChannel, message: AuthMessage) {
    this.channels.forEach((channel) => {
      if (channel !== from) setTimeout(() => channel.deliver(message), 0);
    });
  }
}

class FakeChannel implements AuthChannel {
  private readonly listeners = new Set<(event: { data: AuthMessage }) => void>();

  constructor(private readonly bus: FakeBus) {
    bus.join(this);
  }

  postMessage(message: AuthMessage) {
    this.bus.broadcast(this, message);
  }

  addEventListener(_type: 'message', listener: (event: { data: AuthMessage }) => void) {
    this.listeners.add(listener);
  }

  removeEventListener(_type: 'message', listener: (event: { data: AuthMessage }) => void) {
    this.listeners.delete(listener);
  }

  deliver(message: AuthMessage) {
    this.listeners.forEach((listener) => listener({ data: message }));
  }
}

/** Web Locks kabi: bir nomdagi vazifalar ketma-ket bajariladi (tablar bo'ylab umumiy). */
function createFakeLocks(): NonNullable<AuthSessionPlatform['requestLock']> {
  let chain: Promise<unknown> = Promise.resolve();
  return (_name, task) => {
    const run = chain.then(task, task);
    chain = run.catch(() => undefined);
    return run;
  };
}

interface TabOptions {
  bus: FakeBus | null;
  locks: AuthSessionPlatform['requestLock'];
  refreshRequest: AuthSessionPlatform['refreshRequest'];
  isNative?: boolean;
  revokeRequest?: AuthSessionPlatform['revokeRequest'];
}

function createTab(options: TabOptions) {
  // Har tab uchun BITTA storage (factory har chaqiruvda yangi nusxa bermasin)
  const storage = memoryStorage();
  const tokenStore = createTokenStore({
    isNative: () => options.isNative ?? false,
    storage: () => storage,
  });
  const session = createAuthSession({
    tokenStore,
    createChannel: () => (options.bus ? new FakeChannel(options.bus) : null),
    requestLock: options.locks,
    refreshRequest: options.refreshRequest,
    revokeRequest: options.revokeRequest ?? (async () => undefined),
    isNative: () => options.isNative ?? false,
    now: () => NOW,
  });
  return { tokenStore, session };
}

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    key: (index) => Array.from(map.keys())[index] ?? null,
    removeItem: (key) => {
      map.delete(key);
    },
    setItem: (key, value) => {
      map.set(key, value);
    },
  };
}

/** Har chaqiruvda yangi token qaytaradigan soxta refresh (rotatsiyani modellashtiradi). */
function fakeRefresh(prefix = 'fresh') {
  let counter = 0;
  const fn = vi.fn(async (): Promise<RefreshResult> => {
    counter += 1;
    return { accessToken: jwt(NOW + HOUR_MS, `${prefix}-${counter}`), refreshToken: `r-${counter}` };
  });
  return fn;
}

describe('tokenStore', () => {
  it('xotiradagi tokenni saqlaydi va faqat o\'zgarganda listener chaqiradi', () => {
    const store = createTokenStore({ isNative: () => false, storage: () => memoryStorage() });
    const listener = vi.fn();
    store.onAccessTokenChange(listener);

    expect(store.setAccessToken('a')).toBe(true);
    expect(store.setAccessToken('a')).toBe(false);
    expect(store.getAccessToken()).toBe('a');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('web\'da refresh token saqlanmaydi, native\'da saqlanadi', () => {
    const webStorage = memoryStorage();
    const web = createTokenStore({ isNative: () => false, storage: () => webStorage });
    web.setStoredRefreshToken('r1');
    expect(web.getStoredRefreshToken()).toBeNull();

    const nativeStorage = memoryStorage();
    const native = createTokenStore({ isNative: () => true, storage: () => nativeStorage });
    native.setStoredRefreshToken('r1');
    expect(native.getStoredRefreshToken()).toBe('r1');
    native.setStoredRefreshToken(null);
    expect(native.getStoredRefreshToken()).toBeNull();
  });

  it('cutover\'dan oldingi localStorage kalitlarini tozalaydi', () => {
    const storage = memoryStorage();
    storage.setItem('accessToken', 'old');
    storage.setItem('refreshToken', 'old');
    const store = createTokenStore({ isNative: () => false, storage: () => storage });
    store.clearLegacyTokenStorage();
    expect(storage.getItem('accessToken')).toBeNull();
    expect(storage.getItem('refreshToken')).toBeNull();
  });
});

describe('readJwtExpiryMs', () => {
  it('exp ni millisekundda qaytaradi, buzuq token uchun null', () => {
    expect(readJwtExpiryMs(jwt(NOW + HOUR_MS))).toBe(Math.floor((NOW + HOUR_MS) / 1000) * 1000);
    expect(readJwtExpiryMs('not-a-jwt')).toBeNull();
    expect(readJwtExpiryMs('a.b.c')).toBeNull();
  });
});

describe('authSession — bitta tab', () => {
  it('parallel refresh chaqiruvlari bitta HTTP so\'rovni bo\'lishadi', async () => {
    const refreshRequest = fakeRefresh();
    const { session, tokenStore } = createTab({ bus: null, locks: null, refreshRequest });

    const [a, b] = await Promise.all([session.refreshAccessToken(null), session.refreshAccessToken(null)]);

    expect(refreshRequest).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
    expect(tokenStore.getAccessToken()).toBe(a);
  });

  it('bootstrapSession: xotirada token bo\'lsa refresh qilmaydi, muvaffaqiyatsiz refresh false qaytaradi', async () => {
    const refreshRequest = fakeRefresh();
    const tab = createTab({ bus: null, locks: null, refreshRequest });
    tab.tokenStore.setAccessToken(jwt(NOW + HOUR_MS));
    expect(await tab.session.bootstrapSession()).toBe(true);
    expect(refreshRequest).not.toHaveBeenCalled();

    const failing = createTab({
      bus: null,
      locks: null,
      refreshRequest: vi.fn(async () => {
        throw new Error('401');
      }),
    });
    expect(await failing.session.bootstrapSession()).toBe(false);
    expect(failing.tokenStore.getAccessToken()).toBeNull();
  });

  it('native: saqlangan refresh token parametr sifatida yuboriladi va rotatsiya saqlanadi', async () => {
    const refreshRequest = fakeRefresh();
    const { session, tokenStore } = createTab({ bus: null, locks: null, refreshRequest, isNative: true });
    tokenStore.setStoredRefreshToken('stored-r0');

    await session.refreshAccessToken(null);

    expect(refreshRequest).toHaveBeenCalledWith('stored-r0');
    expect(tokenStore.getStoredRefreshToken()).toBe('r-1');
  });

  it('native: saqlangan refresh token bo\'lmasa refresh urinilmaydi', async () => {
    const refreshRequest = fakeRefresh();
    const { session } = createTab({ bus: null, locks: null, refreshRequest, isNative: true });
    await expect(session.refreshAccessToken(null)).rejects.toThrow();
    expect(refreshRequest).not.toHaveBeenCalled();
  });

  it('revokeServerSession xatoni yutadi', async () => {
    const revokeRequest = vi.fn(async () => {
      throw new Error('network');
    });
    const { session } = createTab({ bus: null, locks: null, refreshRequest: fakeRefresh(), revokeRequest });
    expect(() => session.revokeServerSession('t')).not.toThrow();
    await Promise.resolve();
    expect(revokeRequest).toHaveBeenCalledWith('t');
  });
});

describe('authSession — tablar orasida', () => {
  it('yuklanayotgan tab tokenni boshqa tabdan oladi, HTTP refresh qilmaydi', async () => {
    const bus = new FakeBus();
    const locks = createFakeLocks();
    const existing = createTab({ bus, locks, refreshRequest: fakeRefresh('existing') });
    const live = jwt(NOW + HOUR_MS, 'live');
    existing.tokenStore.setAccessToken(live);

    const refreshRequest = fakeRefresh('booting');
    const booting = createTab({ bus, locks, refreshRequest });

    expect(await booting.session.bootstrapSession()).toBe(true);
    expect(booting.tokenStore.getAccessToken()).toBe(live);
    expect(refreshRequest).not.toHaveBeenCalled();
  });

  it('muddati tugayotgan token boshqa tabga taklif qilinmaydi', async () => {
    const bus = new FakeBus();
    const locks = createFakeLocks();
    const stale = createTab({ bus, locks, refreshRequest: fakeRefresh('stale') });
    stale.tokenStore.setAccessToken(jwt(NOW + 10_000, 'almost-expired'));

    const refreshRequest = fakeRefresh('booting');
    const booting = createTab({ bus, locks, refreshRequest });

    await booting.session.bootstrapSession();
    expect(refreshRequest).toHaveBeenCalledTimes(1);
  });

  it('ikki tab bir vaqtda 401 olsa — bitta HTTP refresh, ikkalasi ham yangi tokenni oladi', async () => {
    const bus = new FakeBus();
    const locks = createFakeLocks();
    const refreshRequest = fakeRefresh();
    const staleToken = jwt(NOW + HOUR_MS, 'stale');

    const tabA = createTab({ bus, locks, refreshRequest });
    const tabB = createTab({ bus, locks, refreshRequest });
    tabA.tokenStore.setAccessToken(staleToken);
    tabB.tokenStore.setAccessToken(staleToken);

    const [a, b] = await Promise.all([
      tabA.session.refreshAccessToken(staleToken),
      tabB.session.refreshAccessToken(staleToken),
    ]);

    expect(refreshRequest).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
    expect(a).not.toBe(staleToken);
  });

  it('login/adoptAccessToken tokenni boshqa tablarga tarqatadi', async () => {
    const bus = new FakeBus();
    const tabA = createTab({ bus, locks: null, refreshRequest: fakeRefresh() });
    const tabB = createTab({ bus, locks: null, refreshRequest: fakeRefresh() });
    const token = jwt(NOW + HOUR_MS, 'login');

    tabA.session.adoptAccessToken(token);
    await new Promise((resolve) => setTimeout(resolve, 5));

    expect(tabB.tokenStore.getAccessToken()).toBe(token);
  });
});
