import React, { useState, useEffect, useRef } from 'react';
import { LanguageCode, TranslationResult, Folder } from '../types';
import { LANGUAGES } from '../data/languages';
import { playBase64Audio, speakWebSpeech, playTextToSpeech } from '../utils/audio';
import { getCacheItem, setCacheItem, getTranslationKey } from '../utils/cacheStore';
import {
  ArrowRightLeft,
  Volume2,
  Mic,
  MicOff,
  Copy,
  Check,
  BookmarkPlus,
  Sparkles,
  BookOpen,
  Flame,
  HelpCircle,
  Loader2,
  Volume1,
  RotateCcw,
} from 'lucide-react';

interface TranslatorTabProps {
  onSavePhraseClick: (result: TranslationResult) => void;
  onAutoSavePhrase?: (
    sourceText: string,
    translatedText: string,
    sourceLang: LanguageCode,
    targetLang: LanguageCode,
    phonetic?: string,
    notes?: string,
    tags?: string[]
  ) => void;
  onSaveQuickPracticeBatch?: (
    practiceItems: {
      sourceText: string;
      translatedText: string;
      sourceLang: LanguageCode;
      targetLang: LanguageCode;
      phonetic: string;
      notes: string;
    }[]
  ) => void;
  folders: Folder[];
}

export const TranslatorTab: React.FC<TranslatorTabProps> = ({
  onSavePhraseClick,
  onAutoSavePhrase,
  onSaveQuickPracticeBatch,
  folders,
}) => {
  const [sourceLang, setSourceLang] = useState<LanguageCode>('en');
  const [targetLang, setTargetLang] = useState<LanguageCode>(() => {
    try { const s = localStorage.getItem('polyglotbot_global_lang'); return (s as LanguageCode) || 'el'; }
    catch { return 'el'; }
  });
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [translationResult, setTranslationResult] = useState<TranslationResult | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [activeAnalysisTab, setActiveAnalysisTab] = useState<'words' | 'slang' | 'grammar'>('words');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);

  // Quick Practice — AI generates fresh phrases each click, tracks used to avoid repeats
  const practiceCategories = [
    '👋 Greetings',
    '🍕 Dining',
    '🚕 Directions',
    '🔥 Street Slang',
    '❓ Questions',
    '☕ Cafe',
    '🛍️ Shopping',
    '🚨 Emergency',
    '🎉 Social',
    '🏨 Hotel',
    '🌅 Morning',
    '🚕 Taxi',
    '💬 Friends',
    '☀️ Weather',
    '👏 Thanks',
  ];

  const labelsPerPage = 6;
  const [practicePage, setPracticePage] = useState<number>(0);
  const [practicingCategory, setPracticingCategory] = useState<string | null>(null);
  const maxPage = Math.ceil(practiceCategories.length / labelsPerPage);
  const visibleCategories = practiceCategories.slice(
    (practicePage % maxPage) * labelsPerPage,
    (practicePage % maxPage) * labelsPerPage + labelsPerPage
  );

  // Track used phrases per category+language to avoid repeats
  const getUsedPhrasesKey = (category: string, lang: string) => `polyglot_used_${category}_${lang}`;

  const getUsedPhrases = (category: string, lang: string): string[] => {
    try {
      const raw = localStorage.getItem(getUsedPhrasesKey(category, lang));
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  };

  const addUsedPhrase = (category: string, lang: string, english: string) => {
    try {
      const used = getUsedPhrases(category, lang);
      used.unshift(english);
      // Keep only last 50 to avoid localStorage bloat
      const trimmed = used.slice(0, 50);
      localStorage.setItem(getUsedPhrasesKey(category, lang), JSON.stringify(trimmed));
    } catch {}
  };

  const handlePracticeClick = async (category: string) => {
    if (practicingCategory) return; // block double-click
    setPracticingCategory(category);
    setIsLoading(true);

    try {
      const used = getUsedPhrases(category, targetLang);
      const res = await fetch('/api/generate-practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: category.replace(/^[^\s]+\s/, ''), // Remove emoji
          targetLang,
          usedPhrases: used,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const english = data.english || '';
        const translated = data.translated || '';
        const phonetic = data.phonetic || '';

        setInputText(english);
        addUsedPhrase(category, targetLang, english);

        // Simulate a translation result so it renders in the output panel
        const fakeResult: TranslationResult = {
          sourceLang: 'en',
          targetLang,
          sourceText: english,
          translatedText: translated,
          overallPhonetic: phonetic,
          sentences: [{
            sourceSentence: english,
            translatedSentence: translated,
            phonetic,
            wordBreakdown: [],
          }],
          slangInsights: data.slangInsights || [],
          grammarNotes: data.grammarNotes || [],
          alternativeTranslations: data.alternativeTranslations || [],
          formalityLevel: 'neutral',
        };
        setTranslationResult(fakeResult);
      }
    } catch (e) {
      console.warn('Practice phrase generation failed:', e);
    } finally {
      setIsLoading(false);
      setPracticingCategory(null);
    }
  };

  // Client-side translation cache for instant 0ms response
  const clientCacheRef = useRef<Map<string, TranslationResult>>(new Map());

  const handleTranslate = async (textToTranslate?: string, srcL = sourceLang, tgtL = targetLang) => {
    const text = textToTranslate !== undefined ? textToTranslate : inputText;
    if (!text || !text.trim()) {
      setTranslationResult(null);
      return;
    }

    const cacheKey = getTranslationKey(srcL, tgtL, text);
    const cachedResult = getCacheItem<TranslationResult>(cacheKey);
    if (cachedResult) {
      setTranslationResult(cachedResult);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, sourceLang: srcL, targetLang: tgtL }),
      });

      if (!response.ok) throw new Error('Translation failed.');
      const data: TranslationResult = await response.json();
      setCacheItem(cacheKey, data);
      setTranslationResult(data);
    } catch (err) {
      console.error('Translation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced auto-translation on typing with instant cache lookup
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (!inputText.trim()) { setTranslationResult(null); return; }

    const cacheKey = getTranslationKey(sourceLang, targetLang, inputText);
    const instantCached = getCacheItem<TranslationResult>(cacheKey);
    if (instantCached) { setTranslationResult(instantCached); return; }

    debounceTimerRef.current = setTimeout(() => { handleTranslate(); }, 350);
    return () => { if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current); };
  }, [inputText, sourceLang, targetLang]);

  useEffect(() => { handleTranslate(); }, []);

  const handleSwapLanguages = () => {
    if (sourceLang === 'auto') return;
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    if (translationResult?.translatedText) setInputText(translationResult.translatedText);
  };

  const handlePlayAudio = async () => {
    if (!translationResult?.translatedText) return;
    setIsPlayingAudio(true);
    try { await playTextToSpeech(translationResult.translatedText, targetLang, playbackSpeed, translationResult.audioBase64); }
    catch {} finally { setIsPlayingAudio(false); }
  };

  const handleCopyText = () => {
    if (!translationResult?.translatedText) return;
    navigator.clipboard.writeText(translationResult.translatedText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { alert('Speech recognition not supported.'); return; }
    if (isListening && recognitionRef.current) { recognitionRef.current.abort(); recognitionRef.current = null; setIsListening(false); return; }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    const langMap: Record<string, string> = { en: 'en-US', es: 'es-ES', fr: 'fr-FR', de: 'de-DE', it: 'it-IT', pt: 'pt-PT', ru: 'ru-RU', zh: 'zh-CN', ja: 'ja-JP', ko: 'ko-KR', ar: 'ar-SA', el: 'el-GR' };
    recognition.lang = sourceLang === 'auto' ? 'en-US' : (langMap[sourceLang] || sourceLang);
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => { setIsListening(false); recognitionRef.current = null; };
    recognition.onerror = () => { setIsListening(false); recognitionRef.current = null; };
    recognition.onresult = (event: any) => { setInputText(event.results[0][0].transcript); };
    recognition.start();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Quick Practice Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3.5 rounded-2xl border-3 border-[#2D3436] shadow-[4px_4px_0px_0px_rgba(45,52,54,1)]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-black uppercase tracking-wider text-[#2D3436] whitespace-nowrap shrink-0 flex items-center">
            <Sparkles className="w-4 h-4 mr-1 text-[#FF6B6B]" />
            Quick Practice:
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 flex-1 min-w-0" style={{ scrollbarWidth: 'thin' }}>
            {visibleCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => handlePracticeClick(cat)}
                disabled={practicingCategory === cat}
                className={`px-3 py-1.5 text-xs font-bold rounded-full border-2 border-[#2D3436] transition whitespace-nowrap shadow-[2px_2px_0px_0px_rgba(45,52,54,1)] shrink-0 ${
                  practicingCategory === cat
                    ? 'bg-[#4ECDC4] text-white animate-pulse'
                    : 'bg-[#F7F3E9] text-[#2D3436] hover:bg-[#FFE66D]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => setPracticePage((p) => p + 1)}
          className="px-3 py-1.5 text-xs font-black bg-[#FFE66D] hover:bg-[#ffd738] text-[#2D3436] rounded-xl border-2 border-[#2D3436] shadow-[2px_2px_0px_0px_rgba(45,52,54,1)] transition flex items-center space-x-1 shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5 text-[#2D3436]" />
          <span>More Topics</span>
        </button>
      </div>

      {/* Main Workspace Card */}
      <div className="bg-white rounded-[32px] sm:rounded-[40px] border-4 border-[#2D3436] shadow-[8px_8px_0px_0px_rgba(45,52,54,1)] sm:shadow-[12px_12px_0px_0px_rgba(45,52,54,1)] overflow-hidden flex flex-col">
        <div className="flex flex-col sm:flex-row items-center justify-between p-4 sm:p-6 border-b-2 border-[#F0F2F5] gap-3 bg-[#F7F3E9]/50">
          <div className="w-full sm:w-auto flex items-center space-x-2">
            <span className="text-xs font-black uppercase tracking-wider text-[#636E72]">From</span>
            <select value={sourceLang} onChange={(e) => setSourceLang(e.target.value as LanguageCode)} className="w-full sm:w-auto bg-[#F7F3E9] text-[#2D3436] px-4 py-2 text-sm font-black rounded-xl border-2 border-[#2D3436] shadow-[2px_2px_0px_0px_rgba(45,52,54,1)] outline-none cursor-pointer">
              <option value="auto">🌐 Auto Detect</option>
              {LANGUAGES.map((l) => (<option key={l.code} value={l.code}>{l.flag} {l.name}</option>))}
            </select>
          </div>
          <button onClick={handleSwapLanguages} disabled={sourceLang === 'auto'} className="w-10 h-10 shrink-0 bg-[#FFE66D] text-[#2D3436] border-2 border-[#2D3436] rounded-xl flex items-center justify-center font-black shadow-[3px_3px_0px_0px_rgba(45,52,54,1)] disabled:opacity-40">
            <ArrowRightLeft className="w-5 h-5" />
          </button>
          <div className="w-full sm:w-auto flex items-center space-x-2">
            <span className="text-xs font-black uppercase tracking-wider text-[#636E72]">To</span>
            <select value={targetLang} onChange={(e) => { const lang = e.target.value as LanguageCode; setTargetLang(lang); try { localStorage.setItem('polyglotbot_global_lang', lang); } catch {} }} className="w-full sm:w-auto bg-[#FFE66D] text-[#2D3436] px-4 py-2 text-sm font-black rounded-xl border-2 border-[#2D3436] shadow-[2px_2px_0px_0px_rgba(45,52,54,1)] outline-none cursor-pointer">
              {LANGUAGES.map((l) => (<option key={l.code} value={l.code}>{l.flag} {l.name}</option>))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="p-6 flex flex-col justify-between min-h-[240px] bg-white border-b-2 md:border-b-0 md:border-r-2 border-[#2D3436]">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-[#636E72]"><span>Type or speak source text</span><span>{inputText.length} / 5000</span></div>
              <textarea value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Type anything here..." rows={5} className="w-full text-[#2D3436] placeholder-[#636E72]/50 bg-transparent text-xl sm:text-2xl font-bold focus:outline-none resize-none leading-relaxed" />
            </div>
            <div className="flex items-center justify-between pt-4 border-t-2 border-[#F0F2F5]">
              <div className="flex items-center space-x-2">
                <button onClick={toggleListening} className={`px-3 py-2 rounded-xl border-2 border-[#2D3436] font-bold text-xs shadow-[2px_2px_0px_0px_rgba(45,52,54,1)] transition flex items-center space-x-1.5 ${isListening ? 'bg-[#FF6B6B] text-white animate-pulse' : 'bg-white text-[#2D3436] hover:bg-[#F7F3E9]'}`}>
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-[#4ECDC4]" />}<span>{isListening ? 'Listening...' : 'Speak'}</span>
                </button>
                {inputText && <button onClick={() => setInputText('')} className="px-2.5 py-2 text-xs font-bold text-[#636E72]">Clear</button>}
              </div>
              <button onClick={() => handleTranslate()} disabled={isLoading || !inputText.trim()} className="px-5 py-2.5 bg-[#FF6B6B] hover:bg-[#ff5252] text-white font-extrabold text-xs rounded-xl border-2 border-[#2D3436] shadow-[3px_3px_0px_0px_rgba(45,52,54,1)] transition flex items-center space-x-1.5 disabled:opacity-50">
                {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Translating...</span></> : <><Sparkles className="w-4 h-4" /><span>Translate</span></>}
              </button>
            </div>
          </div>

          <div className="p-6 flex flex-col justify-between min-h-[240px] bg-[#F7F3E9]/30 relative">
            {isLoading && <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex items-center justify-center z-10"><div className="flex items-center space-x-2 text-[#2D3436] font-black text-sm bg-[#FFE66D] px-4 py-2 rounded-2xl border-2 border-[#2D3436] shadow-[4px_4px_0px_0px_rgba(45,52,54,1)]"><Loader2 className="w-5 h-5 animate-spin text-[#FF6B6B]" /><span>Generating...</span></div></div>}
            {translationResult ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-[#4ECDC4] text-white border-2 border-[#2D3436]">{LANGUAGES.find((l) => l.code === targetLang)?.flag} {LANGUAGES.find((l) => l.code === targetLang)?.name}</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FFE66D] text-[#2D3436] border border-[#2D3436] capitalize">{translationResult.formalityLevel}</span>
                  </div>
                  <button onClick={() => onSavePhraseClick(translationResult)} className="px-4 py-2 bg-white text-[#2D3436] font-extrabold text-xs rounded-xl border-2 border-[#2D3436] shadow-[3px_3px_0px_0px_rgba(45,52,54,1)] hover:bg-[#FFE66D] transition flex items-center space-x-1.5"><BookmarkPlus className="w-4 h-4 text-[#FF6B6B]" /><span>Save</span></button>
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-[#2D3436] leading-snug">{translationResult.translatedText}</h2>
                  {translationResult.overallPhonetic && <div className="mb-4"><span className="text-[#FF6B6B] font-mono italic text-sm font-bold">[{translationResult.overallPhonetic}]</span></div>}
                </div>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button onClick={handlePlayAudio} disabled={isPlayingAudio} className="w-12 h-12 bg-[#4ECDC4] border-2 border-[#2D3436] rounded-xl flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(45,52,54,1)]"><Volume2 className={`w-6 h-6 text-white ${isPlayingAudio ? 'animate-bounce' : ''}`} /></button>
                  <div className="flex items-center bg-white rounded-xl p-1 border-2 border-[#2D3436] text-xs font-bold shadow-[2px_2px_0px_0px_rgba(45,52,54,1)]">
                    {[1.0, 0.75, 0.5].map((s) => (<button key={s} onClick={() => setPlaybackSpeed(s)} className={`px-2.5 py-1 rounded-lg ${playbackSpeed === s ? 'bg-[#2D3436] text-white' : 'text-[#636E72]'}`}>{s}x</button>))}
                  </div>
                  <button onClick={handleCopyText} className="p-2.5 rounded-xl bg-white text-[#2D3436] border-2 border-[#2D3436] shadow-[2px_2px_0px_0px_rgba(45,52,54,1)]">{isCopied ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5" />}</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-2 text-[#636E72]"><BookOpen className="w-10 h-10 stroke-2 text-[#4ECDC4]" /><p className="text-sm font-bold">Type any phrase above or click a Quick Practice topic</p></div>
            )}
          </div>
        </div>
      </div>

      {/* Deep Learning Breakdown Card */}
      {translationResult && (
        <div className="bg-white rounded-[28px] border-4 border-[#2D3436] shadow-[8px_8px_0px_0px_rgba(45,52,54,1)] overflow-hidden">
          <div className="flex items-center space-x-2 p-3 bg-[#F7F3E9] border-b-2 border-[#2D3436] overflow-x-auto">
            {[{ id: 'words' as const, icon: BookOpen, label: 'Word Breakdown', count: translationResult.sentences.flatMap((s: any) => s.wordBreakdown).length, color: '#4ECDC4' }, { id: 'slang' as const, icon: Flame, label: 'Slang & Culture', count: translationResult.slangInsights.length, color: '#FF6B6B' }, { id: 'grammar' as const, icon: Sparkles, label: 'Grammar', count: 0, color: '#FFE66D' }].map((t) => (
              <button key={t.id} onClick={() => setActiveAnalysisTab(t.id)} className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition border-2 ${activeAnalysisTab === t.id ? 'bg-[#2D3436] text-white border-[#2D3436]' : 'bg-white text-[#2D3436] border-transparent hover:border-[#2D3436]'}`}>
                <t.icon className="w-4 h-4" style={{ color: t.color }} /><span>{t.label} ({t.count})</span>
              </button>
            ))}
          </div>
          <div className="p-6">
            {activeAnalysisTab === 'words' && (
              <div className="space-y-6">
                {translationResult.sentences.map((sent: any, sIdx: number) => (
                  <div key={sIdx} className="space-y-3">
                    <div className="p-4 bg-[#FFE66D]/30 rounded-2xl border-2 border-[#2D3436]"><p className="font-extrabold text-[#2D3436] text-lg">{sent.translatedSentence}</p>{sent.phonetic && <p className="text-xs text-[#FF6B6B] font-mono font-bold mt-1">[{sent.phonetic}]</p>}<p className="text-xs font-bold text-[#636E72] mt-1">"{sent.sourceSentence}"</p></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {(sent.wordBreakdown || []).map((word: any, wIdx: number) => (
                        <div key={wIdx} className="p-4 bg-white rounded-2xl border-2 border-[#2D3436] shadow-[4px_4px_0px_0px_rgba(45,52,54,1)] space-y-2.5">
                          <div className="flex items-center justify-between"><span className="font-black text-[#2D3436] text-lg">{word.original}</span><span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#4ECDC4] text-white border border-[#2D3436]">{word.pos}</span></div>
                          {word.phonetic && <p className="text-xs font-mono font-bold text-[#FF6B6B] bg-[#FF6B6B]/10 px-2 py-0.5 rounded-md border border-[#FF6B6B]/30 inline-block">[{word.phonetic}]</p>}
                          <div className="flex items-center justify-between pt-1 border-t border-[#2D3436]/10">
                            <p className="text-xs font-bold text-[#2D3436]">English: <span className="text-[#00B894] font-black">{word.translation}</span></p>
                            <button onClick={() => playTextToSpeech(word.original, targetLang, playbackSpeed)} className="px-2 py-1 rounded-xl bg-[#FFE66D] text-[#2D3436] border border-[#2D3436] hover:bg-[#FF6B6B] hover:text-white transition shadow-[2px_2px_0px_0px_rgba(45,52,54,1)] flex items-center space-x-1"><Volume2 className="w-3.5 h-3.5" /><span className="text-[10px] font-black">Listen</span></button>
                          </div>
                          {word.note && <p className="text-[11px] font-semibold text-[#636E72] italic bg-[#F7F3E9] p-2 rounded-lg border border-[#2D3436]/20">💡 {word.note}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {activeAnalysisTab === 'slang' && (
              <div className="space-y-4">
                <div className="p-4 bg-[#FFE66D] rounded-2xl border-2 border-[#2D3436] shadow-[4px_4px_0px_0px_rgba(45,52,54,1)] text-xs text-[#2D3436] font-bold flex items-start space-x-2"><Flame className="w-5 h-5 text-[#FF6B6B] shrink-0 mt-0.5" /><div><strong>Native Urban Culture Insight:</strong> How locals express this in real life!</div></div>
                {translationResult.slangInsights.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {translationResult.slangInsights.map((slang: any, idx: number) => (
                      <div key={idx} className="p-5 bg-white rounded-2xl border-2 border-[#2D3436] shadow-[4px_4px_0px_0px_rgba(45,52,54,1)] space-y-2">
                        <div className="flex items-center justify-between"><h4 className="text-base font-black text-[#2D3436]">{slang.phrase}</h4><span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#FF6B6B] text-white border border-[#2D3436]">{slang.register}</span></div>
                        <p className="text-xs text-[#2D3436] font-bold"><strong>Meaning:</strong> {slang.meaning}</p>
                        {slang.literalTranslation && <p className="text-xs text-[#636E72] italic">Literal: "{slang.literalTranslation}"</p>}
                        <p className="text-xs text-[#2D3436] bg-[#4ECDC4]/20 p-3 rounded-xl border border-[#2D3436] font-medium"><strong>Cultural Note:</strong> {slang.culturalNote}</p>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm font-bold text-[#636E72]">No slang detected for this phrase.</p>}
              </div>
            )}
            {activeAnalysisTab === 'grammar' && (
              <div className="space-y-4">
                {translationResult.grammarNotes.length > 0 && (
                  <div><h4 className="text-xs font-black uppercase text-[#636E72] mb-2">Grammar Tips</h4>
                    <ul className="space-y-2">{translationResult.grammarNotes.map((note: string, idx: number) => (<li key={idx} className="flex items-start space-x-2 text-xs font-bold text-[#2D3436] bg-[#4ECDC4]/20 p-3 rounded-xl border-2 border-[#2D3436]"><Sparkles className="w-4 h-4 text-[#FF6B6B] shrink-0 mt-0.5" /><span>{note}</span></li>))}</ul>
                  </div>
                )}
                {translationResult.alternativeTranslations.length > 0 && (
                  <div><h4 className="text-xs font-black uppercase text-[#636E72] mb-2">Alternatives</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{translationResult.alternativeTranslations.map((alt: string, idx: number) => (<div key={idx} className="p-3 bg-white rounded-xl border-2 border-[#2D3436] text-xs font-bold text-[#2D3436] shadow-[2px_2px_0px_0px_rgba(45,52,54,1)]">"{alt}"</div>))}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};