// High-performance client-side cache store utilizing localStorage with memory fallback
// Eliminates redundant API calls and rate-limit hits across user sessions.

const memoryCache = new Map<string, { value: any; expiresAt: number }>();

const STORAGE_PREFIX = 'polyglot_cache_v1_';

export function getCacheItem<T>(key: string): T | null {
  const fullKey = STORAGE_PREFIX + key;
  const now = Date.now();

  // 1. Check memory cache first (0ms overhead)
  const mem = memoryCache.get(fullKey);
  if (mem) {
    if (mem.expiresAt > now) {
      return mem.value as T;
    } else {
      memoryCache.delete(fullKey);
    }
  }

  // 2. Check localStorage for persistent cache across sessions/reloads
  try {
    const raw = localStorage.getItem(fullKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (parsed.expiresAt && parsed.expiresAt < now) {
      localStorage.removeItem(fullKey);
      return null;
    }

    // Populate memory cache for faster future lookups
    memoryCache.set(fullKey, { value: parsed.value, expiresAt: parsed.expiresAt });
    return parsed.value as T;
  } catch (err) {
    console.warn('localStorage cache read warning:', err);
    return null;
  }
}

export function setCacheItem<T>(key: string, value: T, ttlMinutes: number = 10080): void { // Default 7 days
  const fullKey = STORAGE_PREFIX + key;
  const expiresAt = Date.now() + ttlMinutes * 60 * 1000;

  // Save to memory cache
  memoryCache.set(fullKey, { value, expiresAt });

  // Save to localStorage
  try {
    localStorage.setItem(fullKey, JSON.stringify({ value, expiresAt }));
  } catch (err) {
    console.warn('localStorage cache write warning (storage full?):', err);
    // If quota exceeded, clear older polyglot entries
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(STORAGE_PREFIX)) {
          localStorage.removeItem(k);
          break; // remove one entry to make room
        }
      }
    } catch (cleanErr) {
      // ignore
    }
  }
}

// Helper key creators
export function getTranslationKey(sourceLang: string, targetLang: string, text: string): string {
  return `trans_${sourceLang}_${targetLang}_${text.trim().toLowerCase()}`;
}

export function getSlangKey(targetLang: string, category: string): string {
  return `slang_${targetLang}_${category.trim().toLowerCase()}`;
}

export function getQuizKey(targetLang: string, topic: string, phraseCount: number): string {
  return `quiz_${targetLang}_${topic.trim().toLowerCase()}_${phraseCount}`;
}

export function getPronunciationKey(expected: string, transcript: string, lang: string): string {
  return `pron_${lang}_${expected.trim().toLowerCase()}_${transcript.trim().toLowerCase()}`;
}
