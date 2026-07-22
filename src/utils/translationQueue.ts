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

export function loadAllCachedTranslations(lang: LanguageCode): Record<string, CachedTranslation> {
  try {
    const key = `${STORAGE_PREFIX}${lang}`;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as Record<string, CachedTranslation> : {};
  } catch {
    return {};
  }
}

async function translateOne(
  english: string,
  targetLang: LanguageCode
): Promise<{ translated: string; phonetic: string; grammarNote?: string } | null> {
  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: english, sourceLang: 'en', targetLang }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return {
      translated: data.translatedText || '',
      phonetic: data.overallPhonetic || '',
      grammarNote: data.grammarNotes?.[0] || undefined,
    };
  } catch {
    return null;
  }
}

interface QueueJob {
  items: Array<{ id: string; english: string }>;
  lang: LanguageCode;
  packId: string;
  onProgress?: (completed: number, total: number) => void;
  onComplete?: () => void;
  onError?: (phraseId: string) => void;
}

class TranslationQueue {
  private jobs: QueueJob[] = [];
  private running = false;
  private lang: LanguageCode = 'en';
  private activePackId: string | null = null;

  // Append items to the queue. Never clears existing jobs.
  // If nothing is running, start processing.
  private enqueue(job: QueueJob): void {
    this.jobs.push(job);
    this.lang = job.lang;
    this.activePackId = job.packId;
    if (!this.running) {
      this.running = true;
      this.run();
    }
  }

  // Preload: silent background translation (no callbacks, no UI updates)
  preloadPack(
    items: Array<{ id: string; english: string }>,
    targetLang: LanguageCode,
    packId: string
  ): void {
    const uncached = items.filter((item) => !getCachedCoreTranslation(item.id, targetLang));
    if (uncached.length === 0) return;

    this.enqueue({
      items: uncached,
      lang: targetLang,
      packId,
    });
    console.log(`TranslationQueue: preloaded Pack ${packId} (${uncached.length} uncached phrases)`);
  }

  // User-triggered: translates with UI progress/complete callbacks
  processQueue(
    items: Array<{ id: string; english: string }>,
    targetLang: LanguageCode,
    callbacks: {
      onProgress?: (completed: number, total: number) => void;
      onComplete?: () => void;
      onError?: (phraseId: string) => void;
    },
    packId?: string
  ): void {
    const uncached = items.filter((item) => !getCachedCoreTranslation(item.id, targetLang));
    if (uncached.length === 0) {
      // Already all cached — fire complete immediately
      callbacks.onProgress?.(uncached.length, uncached.length);
      callbacks.onComplete?.();
      return;
    }

    this.enqueue({
      items: uncached,
      lang: targetLang,
      packId: packId || `pack-${Date.now()}`,
      onProgress: callbacks.onProgress,
      onComplete: callbacks.onComplete,
      onError: callbacks.onError,
    });
    console.log(`TranslationQueue: processing Pack ${packId} (${uncached.length} uncached phrases)`);
  }

  // Process jobs sequentially. Each job runs to completion before the next starts.
  private async run(): Promise<void> {
    while (this.jobs.length > 0) {
      const job = this.jobs[0]; // peek, don't shift yet (we process item by item)
      this.activePackId = job.packId;
      this.lang = job.lang;

      let completed = 0;
      const total = job.items.length;

      // Process this job's items one by one with 4-second gaps
      for (let i = 0; i < job.items.length; i++) {
        const item = job.items[i];

        const cached = getCachedCoreTranslation(item.id, job.lang);
        if (!cached) {
          const result = await translateOne(item.english, job.lang);
          if (result) {
            setCachedCoreTranslation(item.id, job.lang, {
              translated: result.translated,
              phonetic: result.phonetic,
              grammarNote: result.grammarNote,
              cachedAt: Date.now(),
            });
          } else {
            job.onError?.(item.id);
          }
        }

        completed++;
        job.onProgress?.(completed, total);

        // 4-second gap between API calls
        if (i < job.items.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 4000));
        }
      }

      // Job complete — fire callback and remove from queue
      job.onComplete?.();
      this.jobs.shift();

      // If next job exists, log it
      if (this.jobs.length > 0) {
        const next = this.jobs[0];
        console.log(`TranslationQueue: starting next job Pack ${next.packId} (${next.items.length} phrases)`);
      }
    }

    this.running = false;
    this.activePackId = null;
  }

  isRunning(): boolean {
    return this.running;
  }

  getActivePackId(): string | null {
    return this.activePackId;
  }

  // Count remaining items across all jobs
  remainingCount(): number {
    return this.jobs.reduce((sum, j) => sum + j.items.length, 0);
  }

  clear(): void {
    this.jobs = [];
    this.running = false;
    this.activePackId = null;
  }
}

export const coreTranslationQueue = new TranslationQueue();