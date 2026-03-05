const INTENDED_PATH_KEY = 'ff:intended-path';
const INTENDED_PATH_MAX_AGE_MS = 1000 * 60 * 60 * 6; // 6 hours

const AUTH_ROUTES = ['/login', '/register'];

interface StoredIntendedPath {
  path: string;
  savedAt: number;
}

export function getCurrentAppPath(): string {
  if (typeof window === 'undefined') {
    return '/';
  }

  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function sanitizeInternalPath(path?: string | null): string | null {
  if (!path || typeof path !== 'string') {
    return null;
  }

  if (!path.startsWith('/') || path.startsWith('//')) {
    return null;
  }

  if (AUTH_ROUTES.some((route) => path.startsWith(route))) {
    return null;
  }

  return path;
}

export function saveIntendedPath(path = getCurrentAppPath()): void {
  const safePath = sanitizeInternalPath(path);
  if (!safePath) {
    return;
  }

  try {
    const payload: StoredIntendedPath = {
      path: safePath,
      savedAt: Date.now(),
    };
    sessionStorage.setItem(INTENDED_PATH_KEY, JSON.stringify(payload));
  } catch {
    // sessionStorage may be unavailable in some environments
  }
}

export function consumeIntendedPath(): string | null {
  try {
    const raw = sessionStorage.getItem(INTENDED_PATH_KEY);
    sessionStorage.removeItem(INTENDED_PATH_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<StoredIntendedPath>;
    if (typeof parsed.path !== 'string' || typeof parsed.savedAt !== 'number') {
      return null;
    }

    if (Date.now() - parsed.savedAt > INTENDED_PATH_MAX_AGE_MS) {
      return null;
    }

    return sanitizeInternalPath(parsed.path);
  } catch {
    return null;
  }
}

export function clearIntendedPath(): void {
  try {
    sessionStorage.removeItem(INTENDED_PATH_KEY);
  } catch {
    // sessionStorage may be unavailable in some environments
  }
}
