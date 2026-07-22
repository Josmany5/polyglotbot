import React, { useState, useEffect } from 'react';
import { LanguageCode, SlangInsight, Folder, SavedPhrase } from '../types';
import { LANGUAGES } from '../data/languages';
import { speakWebSpeech } from '../utils/audio';
import { getCacheItem, setCacheItem, getSlangKey } from '../utils/cacheStore';
import {
  Flame,
  Volume2,
  BookmarkPlus,
  Sparkles,
  Loader2,
  Check,
  Compass,
} from 'lucide-react';

interface UrbanSlangHubTabProps {
  onSaveSlangToPhrasebook: (
    phrase: string,
    meaning: string,
    targetLang: LanguageCode,
    culturalNote: string,
    phonetic: string
  ) => void;
  folders: Folder[];
}

export const UrbanSlangHubTab: React.FC<UrbanSlangHubTabProps> = ({
  onSaveSlangToPhrasebook,
}) => {
  const [selectedLang, setSelectedLang] = useState<LanguageCode>('el'); // Greek by default!
  const [category, setCategory] = useState<string>('street slang');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [slangList, setSlangList] = useState<
    {
      phrase: string;
      phonetic: string;
      meaning: string;
      literalTranslation: string;
      culturalNote: string;
      register: string;
    }[]
  >([]);
  const [savedStatus, setSavedStatus] = useState<Record<string, boolean>>({});

  const handleFetchSlang = async (lang = selectedLang, cat = category) => {
    setSavedStatus({});
    const cacheKey = getSlangKey(lang, cat);
    const cachedData = getCacheItem<any[]>(cacheKey);
    if (cachedData && cachedData.length > 0) {
      setSlangList(cachedData);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/generate-urban-slang', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetLang: lang,
          category: cat,
        }),
      });

      if (!response.ok) throw new Error('Failed to fetch urban slang.');

      const data = await response.json();
      const list = data.slangList || [];
      if (list.length > 0) {
        setCacheItem(cacheKey, list);
      }
      setSlangList(list);
    } catch (err) {
      console.error('Slang error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    handleFetchSlang();
  }, [selectedLang, category]);

  const handlePlayAudio = (phrase: string) => {
    speakWebSpeech(phrase, selectedLang);
  };

  const handleSave = (item: (typeof slangList)[0]) => {
    onSaveSlangToPhrasebook(
      item.phrase,
      item.meaning,
      selectedLang,
      item.culturalNote,
      item.phonetic
    );
    setSavedStatus((prev) => ({ ...prev, [item.phrase]: true }));
  };

  const langInfo = LANGUAGES.find((l) => l.code === selectedLang);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Banner */}
      <div className="bg-[#FFE66D] rounded-[32px] border-4 border-[#2D3436] shadow-[12px_12px_0px_0px_rgba(45,52,54,1)] p-6 sm:p-8 text-[#2D3436] space-y-3 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Flame className="w-48 h-48 text-[#FF6B6B]" />
        </div>

        <div className="flex items-center space-x-2">
          <span className="p-2 bg-white rounded-xl border-2 border-[#2D3436] shadow-[2px_2px_0px_0px_rgba(45,52,54,1)]">
            <Flame className="w-6 h-6 text-[#FF6B6B]" />
          </span>
          <span className="text-xs font-black uppercase tracking-widest text-[#2D3436]">
            Native Culture & Street Lingo
          </span>
        </div>

        <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
          Urban Slang & Idiom Hub
        </h2>
        <p className="text-xs sm:text-sm font-bold text-[#2D3436] max-w-xl leading-relaxed">
          Discover authentic colloquial terms, street expressions, and cultural idioms used by young native locals in Greek, Spanish, French, Japanese, and more!
        </p>

        {/* Filters */}
        <div className="pt-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 bg-white px-3.5 py-2 rounded-xl border-2 border-[#2D3436] shadow-[2px_2px_0px_0px_rgba(45,52,54,1)]">
            <span className="text-xs font-black text-[#2D3436]">Language:</span>
            <select
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value as LanguageCode)}
              className="bg-transparent text-[#2D3436] text-xs font-black outline-none cursor-pointer"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code} className="text-slate-900 font-bold">
                  {l.flag} {l.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2 bg-white px-3.5 py-2 rounded-xl border-2 border-[#2D3436] shadow-[2px_2px_0px_0px_rgba(45,52,54,1)]">
            <span className="text-xs font-black text-[#2D3436]">Category:</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-transparent text-[#2D3436] text-xs font-black outline-none cursor-pointer"
            >
              <option value="street slang" className="text-slate-900 font-bold">🔥 Street Slang & Hype</option>
              <option value="friendship & casual" className="text-slate-900 font-bold">🤝 Friendship & Casual Greetings</option>
              <option value="reactions & emotions" className="text-slate-900 font-bold">😮 Reactions & Surprise</option>
              <option value="nightlife & food" className="text-slate-900 font-bold">🍕 Food & Nightlife Lingo</option>
            </select>
          </div>

          <button
            onClick={() => handleFetchSlang()}
            disabled={isLoading}
            className="px-4 py-2 bg-[#FF6B6B] hover:bg-[#ff5252] text-white font-black text-xs rounded-xl border-2 border-[#2D3436] shadow-[3px_3px_0px_0px_rgba(45,52,54,1)] transition flex items-center space-x-1.5"
          >
            <Sparkles className="w-4 h-4" />
            <span>Discover More</span>
          </button>
        </div>
      </div>

      {/* Slang Cards Grid */}
      {isLoading ? (
        <div className="p-12 text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#FF6B6B]" />
          <p className="text-sm font-black text-[#2D3436]">
            Fetching authentic native slang expressions for {langInfo?.name}...
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {slangList.map((item, idx) => (
            <div
              key={idx}
              className="p-5 bg-white rounded-2xl border-3 border-[#2D3436] shadow-[6px_6px_0px_0px_rgba(45,52,54,1)] space-y-3 hover:translate-x-[-2px] hover:translate-y-[-2px] transition group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#4ECDC4] text-white border border-[#2D3436]">
                    {langInfo?.flag} {item.register || 'Urban Slang'}
                  </span>
                  <h3 className="text-2xl font-black text-[#2D3436] mt-1">
                    {item.phrase}
                  </h3>
                  {item.phonetic && (
                    <p className="text-xs font-mono font-bold text-[#FF6B6B]">
                      [{item.phonetic}]
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => handlePlayAudio(item.phrase)}
                    className="p-2 rounded-xl bg-[#FFE66D] border-2 border-[#2D3436] text-[#2D3436] shadow-[2px_2px_0px_0px_rgba(45,52,54,1)] hover:bg-[#ffd738] transition"
                    title="Play Audio"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleSave(item)}
                    disabled={savedStatus[item.phrase]}
                    className={`px-3.5 py-2 text-xs font-black rounded-xl border-2 border-[#2D3436] shadow-[2px_2px_0px_0px_rgba(45,52,54,1)] transition flex items-center space-x-1 ${
                      savedStatus[item.phrase]
                        ? 'bg-[#4ECDC4] text-white'
                        : 'bg-[#FF6B6B] hover:bg-[#ff5252] text-white'
                    }`}
                  >
                    {savedStatus[item.phrase] ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Saved</span>
                      </>
                    ) : (
                      <>
                        <BookmarkPlus className="w-3.5 h-3.5" />
                        <span>Save</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <p className="text-[#2D3436] font-extrabold text-sm">
                  <strong>Meaning:</strong> {item.meaning}
                </p>

                {item.literalTranslation && (
                  <p className="text-[#636E72] font-bold italic">
                    Literal translation: "{item.literalTranslation}"
                  </p>
                )}

                <div className="p-3 bg-[#F7F3E9] rounded-xl border-2 border-[#2D3436] text-[#2D3436] font-bold">
                  <strong className="text-[#FF6B6B]">Cultural Note:</strong> {item.culturalNote}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
