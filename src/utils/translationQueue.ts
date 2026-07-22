// Lazy Translation Queue — translates phrases one at a time with 4-second gaps
// Respects Gemini free tier: 15 RPM (one request every 4 seconds)
// Results cached in localStorage permanently

import { LanguageCode } from '../types';

const STORAGE_PREFIX = 'polyglot_core_';

interface CachedTranslation {
  translated: string;
  phonetic: string;
  grammarNote?: string;
  cachedAt: number;
}

// Get cached translation for a phrase ID + language
export function getCachedCoreTranslation(phraseId: string, lang: LanguageCode): CachedTranslation | null {
  try {
    const key = `${STORAGE_PREFIX}${lang}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const cache = JSON.parse(raw) as Record<string, CachedTranslation>;
    return cache[phraseId] || null;
  } catch {
    return null;
  }
}

// Save translation to localStorage
export function setCachedCoreTranslation(phraseId: string, lang: LanguageCode, translation: CachedTranslation): void {
  try {
    const key = `${STORAGE_PREFIX}${lang}`;
    const raw = localStorage.getItem(key);
    const cache = raw ? JSON.parse(raw) as Record<string, CachedTranslation> : {};
    cache[phraseId] = translation;
    localStorage.setItem(key, JSON.stringify(cache));
  } catch (e) {
    console.warn('Failed to cache core translation:', e);
  }
}

// Load all cached translations for a language
export function loadAllCachedTranslations(lang: LanguageCode): Record<string, CachedTranslation> {
  try {
    const key = `${STORAGE_PREFIX}${lang}`;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as Record<string, CachedTranslation> : {};
  } catch {
    return {};
  }
}

// Translate a single phrase via the API
async function translateOne(
  english: string,
  targetLang: LanguageCode
): Promise<{ translated: string; phonetic: string; grammarNote?: string } | null> {
  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: english,
        sourceLang: 'en',
        targetLang,
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    return {
      translated: data.translatedText || '',
      phonetic: data.overallPhonetic || '',
      grammarNote: data.grammarNotes?.[0] || undefined,
    };
  } catch (err) {
    console.warn('Core phrase translation failed:', err);
    return null;
  }
}

// Queue-based translation manager
class TranslationQueue {
  private queue: Array<{ id: string; english: string }> = [];
  private running = false;
  private lang: LanguageCode = 'en';
  private onProgress?: (completed: number, total: number) => void;
  private onComplete?: () => void;
  private onError?: (phraseId: string) => void;
  private total = 0;
  private activePackId: string | null = null;

  // Preload next packs (call after language change or pack unlock)
  preloadPack(
    items: Array<{ id: string; english: string }>,
    targetLang: LanguageCode,
    packId: string,
    priority: boolean = false
  ): void {
    // Filter to only uncached items
    const uncached = items.filter((item) => !getCachedCoreTranslation(item.id, targetLang));
    if (uncached.length === 0) return;

    // If a pack is already running with higher priority, don't interrupt
    if (this.running && this.activePackId && !priority) {
      // Queue items after current batch
      this.queue.push(...uncached);
      return;
    }

    // If priority, clear existing queue and start fresh
    if (priority) {
      this.queue = [];
    }

    this.queue = [...this.queue, ...uncached];
    this.lang = targetLang;
    this.total = this.queue.length;
    this.activePackId = packId;

    if (!this.running) {
      this.running = true;
      this.run();
    }
  }

  async processQueue(
    items: Array<{ id: string; english: string }>,
    targetLang: LanguageCode,
    callbacks: {
      onProgress?: (completed: number, total: number) => void;
      onComplete?: () => void;
      onError?: (phraseId: string) => void;
    },
    packId?: string
  ): Promise<void> {
    // Block if another pack is actively processing with priority
    if (this.running) {
      console.warn('TranslationQueue: already running, queueing instead');
    }

    const uncached = items.filter((item) => !getCachedCoreTranslation(item.id, targetLang));
    this.queue = [...uncached];
    this.lang = targetLang;
    this.onProgress = callbacks.onProgress;
    this.onComplete = callbacks.onComplete;
    this.onError = callbacks.onError;
    this.total = uncached.length;
    this.activePackId = packId || null;

    if (!this.running && this.queue.length > 0) {
      this.running = true;
      await this.run();
    } else if (this.running) {
      // Return after current run completes with callbacks attached
      await this.waitForCompletion();
    }
  }

  private async waitForCompletion(): Promise<void> {
    return new Promise((resolve) => {
      const check = setInterval(() => {
        if (!this.running) {
          clearInterval(check);
          this.onComplete?.();
          resolve();
        }
      }, 500);
    });
  }

  private async run(): Promise<void> {
    let completed = 0;
    const total = this.total;

    while (this.queue.length > 0) {
      const item = this.queue.shift()!;

      // Check if already cached
      const cached = getCachedCoreTranslation(item.id, this.lang);
      if (!cached) {
        // Translate via API
        const result = await translateOne(item.english, this.lang);
        if (result) {
          setCachedCoreTranslation(item.id, this.lang, {
            translated: result.translated,
            phonetic: result.phonetic,
            grammarNote: result.grammarNote,
            cachedAt: Date.now(),
          });
        } else {
          this.onError?.(item.id);
        }
      }

      completed++;
      this.onProgress?.(completed, total);

      // 4-second gap between API calls (respect 15 RPM limit)
      if (this.queue.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, 4000));
      }
    }

    this.running = false;
    this.onComplete?.();
  }

  isRunning(): boolean {
    return this.running;
  }

  getActivePackId(): string | null {
    return this.activePackId;
  }

  clear(): void {
    this.queue = [];
    this.running = false;
    this.activePackId = null;
  }
}

// Singleton queue instance
export const coreTranslationQueue = new TranslationQueue();