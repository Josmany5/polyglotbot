import React, { useState, useEffect, useRef } from 'react';
import { SavedPhrase, Folder, LanguageCode } from '../types';
import { LANGUAGES } from '../data/languages';
import { CORE_PACKS, CorePack } from '../data/corePhrases';
import { playTextToSpeech } from '../utils/audio';
import { getCachedCoreTranslation, setCachedCoreTranslation, loadAllCachedTranslations } from '../utils/translationQueue';
import {
  BookOpen,
  Sparkles,
  Unlock,
  CheckCircle2,
  Volume2,
  GraduationCap,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface CurriculumTabProps {
  onUnlockPack: (folderName: string, folderDesc: string, items: {
    sourceText: string;
    translatedText: string;
    sourceLang: LanguageCode;
    targetLang: LanguageCode;
    phonetic: string;
    notes: string;
    tags: string[];
  }[], packId?: string) => void;
  unlockedPackIds: string[];
  savedPhrases: SavedPhrase[];
}

export const CurriculumTab: React.FC<CurriculumTabProps> = ({
  onUnlockPack,
  unlockedPackIds,
  savedPhrases,
}) => {
  const [selectedLang, setSelectedLang_] = useState<LanguageCode>('el');
  const [translatingPackId, setTranslatingPackId] = useState<string | null>(null);
  const [translationProgress, setTranslationProgress] = useState<{ completed: number; total: number } | null>(null);
  const [expandedPhraseId, setExpandedPhraseId] = useState<string | null>(null);
  const [collapsedPacks, setCollapsedPacks] = useState<Set<number>>(new Set());

  const langObj = LANGUAGES.find((l) => l.code === selectedLang) || LANGUAGES[11];

  // Batch translate a pack in a single API call (~3 seconds instead of ~2 minutes)
  const handleUnlockPack = async (pack: CorePack) => {
    const packId = `${selectedLang}-core-pack-${pack.packNumber}`;
    if (unlockedPackIds.includes(packId) || translatingPackId) return;

    const uncached = pack.phrases.filter((p) => !getCachedCoreTranslation(p.id, selectedLang));
    if (uncached.length === 0) {
      // All cached — just add to phrasebook
      addPackToPhrasebook(pack, packId);
      return;
    }

    setTranslatingPackId(packId);
    setTranslationProgress({ completed: 0, total: pack.phrases.length });

    try {
      const res = await fetch('/api/batch-translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phrases: uncached.map((p) => ({ id: p.id, english: p.english })),
          targetLang: selectedLang,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const results = data.results || [];
        results.forEach((r: any) => {
          setCachedCoreTranslation(r.id, selectedLang, {
            translated: r.translated || '',
            phonetic: r.phonetic || '',
            grammarNote: r.grammarNote || undefined,
            cachedAt: Date.now(),
          });
        });
        setTranslationProgress({ completed: pack.phrases.length, total: pack.phrases.length });
      }
    } catch (e) {
      console.warn('Batch translate failed, falling back to single:', e);
    }

    addPackToPhrasebook(pack, packId);
    setTranslatingPackId(null);
    setTranslationProgress(null);
  };

  const addPackToPhrasebook = (pack: CorePack, packId: string) => {
    const items = pack.phrases.map((p) => {
      const cached = getCachedCoreTranslation(p.id, selectedLang);
      return {
        sourceText: p.english,
        translatedText: cached?.translated || '',
        sourceLang: 'en' as LanguageCode,
        targetLang: selectedLang,
        phonetic: cached?.phonetic || '',
        notes: cached?.grammarNote || '',
        tags: [langObj.name, 'Core Deck', `Pack ${pack.packNumber}`],
      };
    }).filter((item) => item.translatedText);

    if (items.length > 0) {
      onUnlockPack(
        `${langObj.flag} ${langObj.name} — ${pack.title}`,
        pack.description,
        items,
        packId
      );
    }
  };

  const toggleCollapse = (packNumber: number) => {
    setCollapsedPacks((prev) => {
      const next = new Set(prev);
      if (next.has(packNumber)) next.delete(packNumber);
      else next.add(packNumber);
      return next;
    });
  };

  const setSelectedLang = (lang: LanguageCode) => {
    setSelectedLang_(lang);
    setExpandedPhraseId(null);
  };

  // Load cached translations for display
  const cachedTranslations = loadAllCachedTranslations(selectedLang);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#FFE66D] via-[#FFE66D]/80 to-[#4ECDC4]/30 rounded-[32px] p-6 sm:p-8 border-4 border-[#2D3436] shadow-[10px_10px_0px_0px_rgba(45,52,54,1)] relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-white rounded-full border-2 border-[#2D3436] text-xs font-black text-[#2D3436] shadow-[2px_2px_0px_0px_rgba(45,52,54,1)]">
              <GraduationCap className="w-4 h-4 text-[#FF6B6B]" />
              <span>FREQUENCY-BASED PHRASE TEXTBOOK</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-[#2D3436] tracking-tight">
              Core Phrase Library
            </h1>
            <p className="text-xs sm:text-sm font-bold text-[#2D3436]/80 max-w-xl">
              400 most useful English phrases organized by real-world frequency. Unlock a pack, translate to your target language, and study through flashcards and speech practice.
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border-3 border-[#2D3436] shadow-[4px_4px_0px_0px_rgba(45,52,54,1)] space-y-1.5 shrink-0">
            <label className="block text-[11px] font-black uppercase text-[#636E72] tracking-wider">
              Target Language
            </label>
            <select
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value as LanguageCode)}
              className="w-full px-4 py-2.5 text-sm font-black rounded-xl border-2 border-[#2D3436] bg-[#FFE66D] text-[#2D3436] shadow-[2px_2px_0px_0px_rgba(45,52,54,1)] outline-none cursor-pointer"
            >
              {LANGUAGES.filter((l) => l.code !== 'auto' && l.code !== 'en').map((l) => (
                <option key={l.code} value={l.code}>
                  {l.flag} {l.name} ({l.nativeName})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Packs List */}
      <div className="space-y-6">
        {CORE_PACKS.map((pack) => {
          const packId = `${selectedLang}-core-pack-${pack.packNumber}`;
          const isUnlocked = unlockedPackIds.includes(packId);
          const isTranslating = translatingPackId === packId;

          return (
            <div
              key={pack.packNumber}
              className="bg-white rounded-[32px] border-4 border-[#2D3436] shadow-[10px_10px_0px_0px_rgba(45,52,54,1)] p-6 sm:p-8 space-y-4"
            >
              {/* Pack Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b-3 border-[#2D3436] pb-5">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="px-3 py-1 rounded-full bg-[#FFE66D] text-[#2D3436] font-black text-xs border-2 border-[#2D3436]">
                      {langObj.flag} {langObj.name}
                    </span>
                    <span className="text-xs font-bold text-[#636E72]">
                      Pack {pack.packNumber} · {pack.phrases.length} Phrases
                    </span>
                    {isUnlocked && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                        Unlocked
                      </span>
                    )}
                  </div>
                  <h3 className="text-2xl font-black text-[#2D3436] mt-2">{pack.title}</h3>
                  <p className="text-xs font-bold text-[#636E72] mt-0.5">{pack.description}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isUnlocked && (
                    <button
                      onClick={() => toggleCollapse(pack.packNumber)}
                      className="px-3 py-2 text-xs font-black bg-[#F7F3E9] text-[#2D3436] rounded-xl border-2 border-[#2D3436] shadow-[2px_2px_0px_0px_rgba(45,52,54,1)] hover:bg-white transition"
                    >
                      {collapsedPacks.has(pack.packNumber) ? 'Show Phrases' : 'Hide Phrases'}
                    </button>
                  )}
                  <button
                    onClick={() => handleUnlockPack(pack)}
                    disabled={isUnlocked || translatingPackId === packId}
                    className={`px-5 py-3 rounded-2xl border-3 border-[#2D3436] shadow-[4px_4px_0px_0px_rgba(45,52,54,1)] font-black text-xs transition flex items-center space-x-2 ${
                      isUnlocked
                        ? 'bg-emerald-100 text-emerald-700 cursor-default'
                        : translatingPackId === packId
                        ? 'bg-[#FFE66D] text-[#2D3436] cursor-wait'
                        : 'bg-[#FF6B6B] hover:bg-[#ff5252] text-white'
                    }`}
                  >
                    {translatingPackId === packId ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Translating...</span>
                      </>
                    ) : isUnlocked ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>In Your Library</span>
                      </>
                    ) : (
                      <>
                        <Unlock className="w-4 h-4" />
                        <span>Unlock Pack</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Translation Progress Bar */}
              {isTranslating && translationProgress && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-black text-[#2D3436]">
                    <span>Translating via AI...</span>
                    <span>{translationProgress.completed} / {translationProgress.total}</span>
                  </div>
                  <div className="w-full bg-[#F7F3E9] h-2.5 rounded-full border-2 border-[#2D3436] overflow-hidden">
                    <div
                      className="bg-[#4ECDC4] h-full transition-all duration-300 rounded-full"
                      style={{ width: `${(translationProgress.completed / translationProgress.total) * 100}%` }}
                    />
                  </div>
                  <p className="text-[10px] font-bold text-[#636E72]">
                    One phrase every 4 seconds to stay within free API limits. Phrases cache permanently.
                  </p>
                </div>
              )}

              {/* Compact Phrase List (visible after unlock, collapsible) */}
              {isUnlocked && !collapsedPacks.has(pack.packNumber) && (
                <div className="space-y-1.5 pt-2">
                  <p className="text-xs font-black uppercase text-[#636E72] tracking-wider mb-2">
                    📖 Phrase List
                  </p>
                  <div className="divide-y-2 divide-[#2D3436]/10">
                {pack.phrases.map((phrase) => {
                  const cached = cachedTranslations[phrase.id];
                  const isExpanded = expandedPhraseId === phrase.id;

                  return (
                    <div key={phrase.id} className="py-2">
                      {/* Main Row */}
                      <div
                        onClick={() => setExpandedPhraseId(isExpanded ? null : phrase.id)}
                        className="flex items-center gap-3 cursor-pointer hover:bg-[#F7F3E9]/50 rounded-lg px-2 py-1 -mx-2 transition"
                      >
                        {/* English (left) */}
                        <div className="w-1/2 min-w-0">
                          <p className="text-xs font-bold text-[#2D3436] truncate">
                            {phrase.english}
                          </p>
                        </div>

                        {/* Target + Phonetic + Always-visible Audio (right) */}
                        <div className="w-1/2 min-w-0 flex items-center gap-2">
                          {cached ? (
                            <>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-black text-[#4ECDC4] truncate">
                                  {cached.translated}
                                </p>
                                {cached.phonetic && (
                                  <p className="text-[10px] font-mono font-bold text-[#FF6B6B] truncate">
                                    [{cached.phonetic}]
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  playTextToSpeech(cached.translated, selectedLang);
                                }}
                                className="p-1.5 rounded-lg bg-[#FFE66D] text-[#2D3436] border border-[#2D3436] hover:bg-[#FF6B6B] hover:text-white transition shrink-0"
                                title="Listen"
                              >
                                <Volume2 className="w-3 h-3" />
                              </button>
                            </>
                          ) : (
                            <p className="text-xs italic text-[#636E72]">⏳ Translating...</p>
                          )}
                          <div className="shrink-0 text-[#636E72]">
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </div>
                        </div>
                      </div>

                          {/* Expanded Detail Panel */}
                          {isExpanded && cached && (
                            <div className="mt-2 ml-2 p-3 bg-[#F7F3E9] rounded-xl border-2 border-[#2D3436] space-y-2 animate-fade-in">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                <div>
                                  <p className="font-black text-[#636E72] uppercase tracking-wider">Translation</p>
                                  <p className="text-base font-black text-[#FF6B6B]">{cached.translated}</p>
                                </div>
                                <div>
                                  <p className="font-black text-[#636E72] uppercase tracking-wider">Pronunciation</p>
                                  <p className="text-sm font-mono font-bold text-[#4ECDC4]">[{cached.phonetic || 'N/A'}]</p>
                                </div>
                              </div>
                              {cached.grammarNote && (
                                <div>
                                  <p className="font-black text-[#636E72] uppercase tracking-wider text-xs">Grammar Note</p>
                                  <p className="text-xs font-bold text-[#2D3436]">💡 {cached.grammarNote}</p>
                                </div>
                              )}
                              <div className="flex gap-2 pt-1">
                                <button
                                  onClick={() => playTextToSpeech(cached.translated, selectedLang)}
                                  className="px-3 py-1.5 text-xs font-black bg-[#4ECDC4] text-white rounded-lg border-2 border-[#2D3436] shadow-[2px_2px_0px_0px_rgba(45,52,54,1)] hover:bg-[#3dbdb4] transition inline-flex items-center gap-1"
                                >
                                  <Volume2 className="w-3 h-3" />
                                  Listen
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};