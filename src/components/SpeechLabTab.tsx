import React, { useState, useRef } from 'react';
import { SavedPhrase, PronunciationFeedback, LanguageCode } from '../types';
import { LANGUAGES } from '../data/languages';
import { speakWebSpeech } from '../utils/audio';
import { getCacheItem, setCacheItem, getPronunciationKey } from '../utils/cacheStore';
import {
  Mic,
  MicOff,
  Volume2,
  Sparkles,
  Award,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RotateCcw,
} from 'lucide-react';

interface SpeechLabTabProps {
  phrases: SavedPhrase[];
}

export const SpeechLabTab: React.FC<SpeechLabTabProps> = ({ phrases }) => {
  const [targetLang, setTargetLang] = useState<LanguageCode>('el');
  const [targetPhrase, setTargetPhrase] = useState<string>('Γεια σου! Τι κάνεις σήμερα;');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [spokenTranscript, setSpokenTranscript] = useState<string>('');
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<PronunciationFeedback | null>(null);
  const recognitionRef = useRef<any>(null);

  const handleListenGuide = () => {
    speakWebSpeech(targetPhrase, targetLang);
  };

  const handleStartRecording = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser environment. Try typing or use Google Chrome.');
      return;
    }

    if (isRecording && recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
      setIsRecording(false);
      return;
    }

    setSpokenTranscript('');
    setFeedback(null);

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    // Map language codes to BCP-47 for proper recognition
    const langBCP47Map: Record<string, string> = {
      en: 'en-US',
      es: 'es-ES',
      fr: 'fr-FR',
      de: 'de-DE',
      it: 'it-IT',
      pt: 'pt-PT',
      ru: 'ru-RU',
      zh: 'zh-CN',
      ja: 'ja-JP',
      ko: 'ko-KR',
      ar: 'ar-SA',
      el: 'el-GR',
    };
    recognition.lang = langBCP47Map[targetLang] || targetLang;
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => {
      setIsRecording(false);
      recognitionRef.current = null;
    };
    recognition.onerror = () => {
      setIsRecording(false);
      recognitionRef.current = null;
    };

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setSpokenTranscript(text);
      if (event.results[0].isFinal) {
        evaluatePronunciation(text);
      }
    };

    recognition.start();
  };

  const evaluatePronunciation = async (transcriptText: string) => {
    if (!transcriptText) return;

    const cacheKey = getPronunciationKey(targetPhrase, transcriptText, targetLang);
    const cachedFb = getCacheItem<PronunciationFeedback>(cacheKey);
    if (cachedFb) {
      setFeedback(cachedFb);
      setIsEvaluating(false);
      return;
    }

    setIsEvaluating(true);

    try {
      const response = await fetch('/api/check-pronunciation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expectedText: targetPhrase,
          transcript: transcriptText,
          targetLang,
        }),
      });

      if (!response.ok) throw new Error('Evaluation failed.');

      const data: PronunciationFeedback = await response.json();
      setCacheItem(cacheKey, data);
      setFeedback(data);
    } catch (err) {
      console.error('Pronunciation check error:', err);
    } finally {
      setIsEvaluating(false);
    }
  };

  const targetLangInfo = LANGUAGES.find((l) => l.code === targetLang);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="bg-white rounded-[32px] border-4 border-[#2D3436] shadow-[12px_12px_0px_0px_rgba(45,52,54,1)] p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b-2 border-[#2D3436] pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FFE66D] border-3 border-[#2D3436] text-[#2D3436] flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(45,52,54,1)]">
              <Mic className="w-6 h-6 text-[#FF6B6B]" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-[#2D3436]">Pronunciation Speech Lab</h2>
              <p className="text-xs font-bold text-[#636E72]">
                Speak into microphone and receive instant AI feedback on pitch, cadence & phonetics
              </p>
            </div>
          </div>

          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value as LanguageCode)}
            className="px-3.5 py-2 text-xs font-black rounded-xl border-2 border-[#2D3436] bg-[#FFE66D] text-[#2D3436] shadow-[2px_2px_0px_0px_rgba(45,52,54,1)] outline-none cursor-pointer"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.flag} {l.name}
              </option>
            ))}
          </select>
        </div>

        {/* Saved Phrase Quick Picker */}
        {phrases.length > 0 && (
          <div>
            <label className="block text-xs font-black uppercase text-[#636E72] mb-1">
              Select phrase from your Phrasebook to practice:
            </label>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  setTargetPhrase(e.target.value);
                  setSpokenTranscript('');
                  setFeedback(null);
                }
              }}
              className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border-2 border-[#2D3436] bg-[#F7F3E9] text-[#2D3436] outline-none cursor-pointer"
            >
              <option value="">-- Choose from saved phrases --</option>
              {phrases
                .filter((p) => p.targetLang === targetLang)
                .map((p) => (
                  <option key={p.id} value={p.translatedText}>
                    {p.translatedText} ({p.sourceText})
                  </option>
                ))}
            </select>
          </div>
        )}

        {/* Target Phrase Box */}
        <div className="p-6 bg-[#FFE66D]/20 rounded-2xl border-2 border-[#2D3436] shadow-[6px_6px_0px_0px_rgba(45,52,54,1)] space-y-3 text-center">
          <p className="text-xs font-black uppercase tracking-wider text-[#FF6B6B]">Target Phrase to Pronounce</p>
          <h3 className="text-3xl sm:text-4xl font-black text-[#2D3436]">
            {targetPhrase}
          </h3>

          <div className="pt-2 flex justify-center">
            <button
              onClick={handleListenGuide}
              className="px-4 py-2.5 bg-[#4ECDC4] text-white font-extrabold text-xs rounded-xl border-2 border-[#2D3436] shadow-[3px_3px_0px_0px_rgba(45,52,54,1)] hover:bg-[#3dbdb4] transition inline-flex items-center space-x-2"
            >
              <Volume2 className="w-4 h-4" />
              <span>Listen Native Speaker Guide</span>
            </button>
          </div>
        </div>

        {/* Microphone Recording Button */}
        <div className="flex flex-col items-center justify-center py-4 space-y-3">
          <button
            onClick={handleStartRecording}
            className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all border-3 border-[#2D3436] shadow-[6px_6px_0px_0px_rgba(45,52,54,1)] ${
              isRecording
                ? 'bg-[#FF6B6B] text-white animate-bounce shadow-[8px_8px_0px_0px_rgba(45,52,54,1)]'
                : 'bg-[#FFE66D] hover:bg-[#ffd738] text-[#2D3436] hover:scale-105'
            }`}
          >
            {isRecording ? <MicOff className="w-8 h-8 text-white" /> : <Mic className="w-8 h-8 text-[#2D3436]" />}
          </button>
          <span className="text-xs font-black text-[#2D3436]">
            {isRecording ? 'Listening... Speak now!' : 'Click Microphone to Start Speaking'}
          </span>
        </div>

        {/* Live Spoken Transcript */}
        {spokenTranscript && (
          <div className="p-4 bg-[#F7F3E9] rounded-2xl border-2 border-[#2D3436] text-center space-y-1 shadow-[3px_3px_0px_0px_rgba(45,52,54,1)]">
            <p className="text-xs font-black text-[#636E72] uppercase">Your Spoken Speech</p>
            <p className="text-lg font-black text-[#2D3436]">"{spokenTranscript}"</p>
          </div>
        )}

        {isEvaluating && (
          <div className="flex items-center justify-center space-x-2 text-[#FF6B6B] font-black text-sm py-4">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>AI Tutor analyzing phonetics & accuracy...</span>
          </div>
        )}

        {/* Feedback Breakdown Card */}
        {feedback && (
          <div className="p-6 bg-white rounded-2xl border-4 border-[#2D3436] shadow-[8px_8px_0px_0px_rgba(45,52,54,1)] space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b-2 border-[#2D3436] pb-3">
              <div className="flex items-center space-x-2">
                <Award className="w-6 h-6 text-[#FF6B6B]" />
                <h4 className="text-lg font-black text-[#2D3436]">AI Pronunciation Score</h4>
              </div>

              <span className={`px-4 py-1 rounded-full text-base font-black border-2 border-[#2D3436] shadow-[2px_2px_0px_0px_rgba(45,52,54,1)] ${
                feedback.score >= 80
                  ? 'bg-[#4ECDC4] text-white'
                  : feedback.score >= 60
                  ? 'bg-[#FFE66D] text-[#2D3436]'
                  : 'bg-[#FF6B6B] text-white'
              }`}>
                {feedback.score} / 100
              </span>
            </div>

            <p className="text-sm font-bold text-[#2D3436]">
              {feedback.feedbackText}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
              {/* Strengths */}
              <div className="p-3.5 bg-[#4ECDC4]/15 rounded-xl border-2 border-[#2D3436] space-y-1 shadow-[2px_2px_0px_0px_rgba(45,52,54,1)]">
                <span className="font-black text-[#2D3436] flex items-center space-x-1">
                  <CheckCircle2 className="w-4 h-4 text-[#4ECDC4]" />
                  <span>Strengths</span>
                </span>
                <ul className="list-disc list-inside space-y-0.5 text-[#2D3436] font-bold">
                  {feedback.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>

              {/* Improvements */}
              <div className="p-3.5 bg-[#FFE66D]/30 rounded-xl border-2 border-[#2D3436] space-y-1 shadow-[2px_2px_0px_0px_rgba(45,52,54,1)]">
                <span className="font-black text-[#2D3436] flex items-center space-x-1">
                  <AlertCircle className="w-4 h-4 text-[#FF6B6B]" />
                  <span>Tips for Improvement</span>
                </span>
                <ul className="list-disc list-inside space-y-0.5 text-[#2D3436] font-bold">
                  {feedback.improvements.map((imp, i) => (
                    <li key={i}>{imp}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
