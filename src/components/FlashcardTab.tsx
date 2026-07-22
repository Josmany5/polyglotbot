import React, { useState } from 'react';
import { SavedPhrase, Folder } from '../types';
import { LANGUAGES } from '../data/languages';
import { playTextToSpeech } from '../utils/audio';
import {
  Layers,
  Volume2,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Flame,
  ArrowRight,
  Shuffle,
} from 'lucide-react';

interface FlashcardTabProps {
  phrases: SavedPhrase[];
  folders: Folder[];
  onUpdateMastery: (phraseId: string, mastery: 'learning' | 'review' | 'mastered') => void;
}

export const FlashcardTab: React.FC<FlashcardTabProps> = ({
  phrases,
  folders,
  onUpdateMastery,
}) => {
  const [selectedFolderId, setSelectedFolderId] = useState<string>('all');
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [completedCount, setCompletedCount] = useState<number>(0);
  const [frontSideMode, setFrontSideMode] = useState<'english' | 'target'>('english');
  const [deckSource, setDeckSource] = useState<'phrasebook' | 'core'>('phrasebook');

  const deckPhrases = deckSource === 'phrasebook'
    ? phrases.filter((p) => selectedFolderId === 'all' || p.folderId === selectedFolderId)
    : phrases.filter((p) => p.tags?.some((t: string) => t.includes('Core Deck')));

  const currentPhrase = deckPhrases[currentIndex];

  const handleNextCard = (rating: 'learning' | 'review' | 'mastered') => {
    if (currentPhrase) {
      onUpdateMastery(currentPhrase.id, rating);
    }
    setIsFlipped(false);
    setCompletedCount((prev) => prev + 1);

    if (currentIndex + 1 < deckPhrases.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setCurrentIndex(0); // loop back
    }
  };

  const handleShuffle = () => {
    setIsFlipped(false);
    setCurrentIndex(Math.floor(Math.random() * Math.max(1, deckPhrases.length)));
  };

  const handlePlayAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentPhrase) {
      playTextToSpeech(currentPhrase.translatedText, currentPhrase.targetLang);
    }
  };

  if (deckPhrases.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-[#FFE66D] border-3 border-[#2D3436] flex items-center justify-center mx-auto text-[#2D3436] shadow-[4px_4px_0px_0px_rgba(45,52,54,1)]">
          <Layers className="w-8 h-8 text-[#FF6B6B]" />
        </div>
        <h3 className="text-2xl font-black text-[#2D3436]">No Flashcards Available</h3>
        <p className="text-sm font-bold text-[#636E72]">
          Save some translated phrases in your Phrasebook to unlock interactive flashcard study decks!
        </p>
      </div>
    );
  }

  const langInfo = LANGUAGES.find((l) => l.code === currentPhrase?.targetLang);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Deck Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-3xl border-4 border-[#2D3436] shadow-[8px_8px_0px_0px_rgba(45,52,54,1)]">
        <div className="flex items-center space-x-2">
          <Layers className="w-5 h-5 text-[#FF6B6B]" />
          <span className="text-sm font-black text-[#2D3436]">Study Deck:</span>
          <div className="flex items-center p-1 bg-[#F7F3E9] rounded-xl border-2 border-[#2D3436] mr-2">
            <button
              onClick={() => { setDeckSource('phrasebook'); setSelectedFolderId('all'); setCurrentIndex(0); setIsFlipped(false); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-black transition ${deckSource === 'phrasebook' ? 'bg-[#2D3436] text-white' : 'text-[#2D3436] hover:bg-white'}`}
            >
              📁 Saved
            </button>
            <button
              onClick={() => { setDeckSource('core'); setCurrentIndex(0); setIsFlipped(false); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-black transition ${deckSource === 'core' ? 'bg-[#4ECDC4] text-white' : 'text-[#2D3436] hover:bg-white'}`}
            >
              📚 Core
            </button>
          </div>
          {deckSource === 'phrasebook' && (
            <select
              value={selectedFolderId}
              onChange={(e) => {
                setSelectedFolderId(e.target.value);
                setCurrentIndex(0);
                setIsFlipped(false);
              }}
              className="bg-[#FFE66D] text-[#2D3436] px-3.5 py-1.5 text-xs font-black rounded-xl border-2 border-[#2D3436] shadow-[2px_2px_0px_0px_rgba(45,52,54,1)] outline-none cursor-pointer"
            >
              <option value="all">All Folders ({phrases.length})</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({phrases.filter((p: any) => p.folderId === f.id).length})
                </option>
              ))}
            </select>
          )}
          {deckSource === 'core' && (
            <span className="text-xs font-bold text-[#4ECDC4]">
              Core Deck ({deckPhrases.length} cards)
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2 text-xs font-black text-[#2D3436]">
          {/* Front Side Mode Switcher */}
          <div className="flex items-center p-1 bg-[#F7F3E9] rounded-xl border-2 border-[#2D3436]">
            <button
              onClick={() => {
                setFrontSideMode('english');
                setIsFlipped(false);
              }}
              className={`px-2.5 py-1 rounded-lg transition ${
                frontSideMode === 'english'
                  ? 'bg-[#2D3436] text-white'
                  : 'text-[#2D3436] hover:bg-white'
              }`}
            >
              🇺🇸 English Front
            </button>
            <button
              onClick={() => {
                setFrontSideMode('target');
                setIsFlipped(false);
              }}
              className={`px-2.5 py-1 rounded-lg transition ${
                frontSideMode === 'target'
                  ? 'bg-[#4ECDC4] text-white'
                  : 'text-[#2D3436] hover:bg-white'
              }`}
            >
              🌍 Target Front
            </button>
          </div>

          <span>
            Card <strong className="text-[#FF6B6B]">{currentIndex + 1}</strong> of {deckPhrases.length}
          </span>
          <button
            onClick={handleShuffle}
            className="w-8 h-8 rounded-xl bg-[#4ECDC4] text-white border-2 border-[#2D3436] shadow-[2px_2px_0px_0px_rgba(45,52,54,1)] hover:bg-[#3dbdb4] transition flex items-center justify-center"
            title="Shuffle deck"
          >
            <Shuffle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-white h-3.5 rounded-full border-2 border-[#2D3436] overflow-hidden p-0.5 shadow-[2px_2px_0px_0px_rgba(45,52,54,1)]">
        <div
          className="bg-[#4ECDC4] h-full transition-all duration-300 rounded-full"
          style={{ width: `${((currentIndex + 1) / deckPhrases.length) * 100}%` }}
        />
      </div>

      {/* 3D Interactive Flip Card */}
      <div
        onClick={() => setIsFlipped(!isFlipped)}
        className="cursor-pointer perspective-1000 min-h-[320px] sm:min-h-[360px] relative w-full group"
      >
        <div
          className={`w-full h-full min-h-[320px] sm:min-h-[360px] rounded-[36px] p-8 bg-white border-4 border-[#2D3436] transition-all duration-300 flex flex-col justify-between ${
            isFlipped
              ? 'shadow-[12px_12px_0px_0px_rgba(255,107,107,1)] bg-[#FFE66D]/10'
              : 'shadow-[12px_12px_0px_0px_rgba(45,52,54,1)] hover:translate-x-[-2px] hover:translate-y-[-2px]'
          }`}
        >
          {/* Card Top Info */}
          <div className="flex items-center justify-between text-xs font-black">
            <span className="px-3 py-1 rounded-full bg-[#4ECDC4] text-white border-2 border-[#2D3436]">
              {langInfo?.flag} {langInfo?.name}
            </span>
            <span className="text-[#2D3436] font-bold flex items-center">
              <RotateCw className="w-3.5 h-3.5 mr-1 text-[#FF6B6B]" /> Click to flip card
            </span>
          </div>

          {/* Card Main Display */}
          <div className="text-center my-auto py-6 space-y-3">
            {!isFlipped ? (
              /* FRONT SIDE */
              <div className="space-y-4 animate-fade-in">
                <p className="text-xs uppercase font-black text-[#636E72] tracking-wider">
                  {frontSideMode === 'english' ? 'English Expression' : `${langInfo?.name || 'Target'} Phrase`}
                </p>
                <h2 className="text-3xl sm:text-4xl font-black text-[#2D3436] leading-snug">
                  {frontSideMode === 'english' ? currentPhrase.sourceText : currentPhrase.translatedText}
                </h2>
                {frontSideMode === 'target' && (
                  <button
                    onClick={handlePlayAudio}
                    className="inline-flex items-center space-x-2 px-5 py-2.5 bg-[#4ECDC4] text-white font-extrabold text-xs rounded-xl border-2 border-[#2D3436] shadow-[3px_3px_0px_0px_rgba(45,52,54,1)] hover:bg-[#3dbdb4] transition"
                  >
                    <Volume2 className="w-4 h-4" />
                    <span>Listen Target Audio</span>
                  </button>
                )}
              </div>
            ) : (
              /* BACK SIDE */
              <div className="space-y-3 animate-fade-in">
                {frontSideMode === 'english' ? (
                  /* Front=English, Back=Target + Phonetic + Notes */
                  <>
                    <p className="text-xs uppercase font-black text-[#FF6B6B] tracking-wider">
                      {langInfo?.name || 'Target'} Translation
                    </p>
                    <h3 className="text-3xl sm:text-4xl font-black text-[#4ECDC4]">
                      {currentPhrase.translatedText}
                    </h3>
                    {currentPhrase.phonetic && (
                      <p className="text-sm font-mono font-extrabold text-[#FF6B6B] bg-[#FFE66D] py-1.5 px-3 rounded-xl inline-block border-2 border-[#2D3436] shadow-[2px_2px_0px_0px_rgba(45,52,54,1)]">
                        [{currentPhrase.phonetic}]
                      </p>
                    )}
                    <div className="pt-2">
                      <button
                        onClick={handlePlayAudio}
                        className="inline-flex items-center space-x-2 px-5 py-2 bg-[#FFE66D] text-[#2D3436] font-extrabold text-xs rounded-xl border-2 border-[#2D3436] shadow-[3px_3px_0px_0px_rgba(45,52,54,1)] hover:bg-[#FF6B6B] hover:text-white transition"
                      >
                        <Volume2 className="w-4 h-4" />
                        <span>Listen Target Audio</span>
                      </button>
                    </div>
                    {currentPhrase.notes && (
                      <p className="text-xs text-[#2D3436] font-bold italic pt-1 max-w-md mx-auto bg-[#F7F3E9] p-3 rounded-xl border border-[#2D3436]">
                        💡 {currentPhrase.notes}
                      </p>
                    )}
                  </>
                ) : (
                  /* Front=Target, Back=English + Notes */
                  <>
                    <p className="text-xs uppercase font-black text-[#FF6B6B] tracking-wider">
                      English Meaning
                    </p>
                    <h3 className="text-3xl sm:text-4xl font-black text-[#2D3436]">
                      "{currentPhrase.sourceText}"
                    </h3>
                    {currentPhrase.phonetic && (
                      <p className="text-xs font-mono font-bold text-[#636E72]">
                        Pronunciation: [{currentPhrase.phonetic}]
                      </p>
                    )}
                    <div className="pt-2">
                      <button
                        onClick={handlePlayAudio}
                        className="inline-flex items-center space-x-2 px-5 py-2 bg-[#4ECDC4] text-white font-extrabold text-xs rounded-xl border-2 border-[#2D3436] shadow-[3px_3px_0px_0px_rgba(45,52,54,1)] hover:bg-[#3dbdb4] transition"
                      >
                        <Volume2 className="w-4 h-4" />
                        <span>Listen Target Audio</span>
                      </button>
                    </div>
                    {currentPhrase.notes && (
                      <p className="text-xs text-[#2D3436] font-bold italic pt-1 max-w-md mx-auto bg-[#F7F3E9] p-3 rounded-xl border border-[#2D3436]">
                        💡 {currentPhrase.notes}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Card Bottom Prompt */}
          <div className="text-center text-xs text-[#636E72] font-bold border-t-2 border-[#F0F2F5] pt-3">
            {isFlipped ? 'Rate how well you recall this phrase below 👇' : 'Try pronouncing and recalling the translation, then flip!'}
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => {
            setIsFlipped(false);
            if (currentIndex > 0) {
              setCurrentIndex((prev) => prev - 1);
            } else {
              setCurrentIndex(deckPhrases.length - 1);
            }
          }}
          className="p-4 bg-white hover:bg-[#F7F3E9] text-[#2D3436] font-black text-xs rounded-2xl border-2 border-[#2D3436] shadow-[4px_4px_0px_0px_rgba(45,52,54,1)] transition flex items-center justify-center space-x-2"
        >
          <ArrowRight className="w-4 h-4 rotate-180" />
          <span>Previous Card</span>
        </button>

        <button
          onClick={() => {
            setIsFlipped(false);
            if (currentIndex + 1 < deckPhrases.length) {
              setCurrentIndex((prev) => prev + 1);
            } else {
              setCurrentIndex(0);
            }
          }}
          className="p-4 bg-[#4ECDC4] hover:bg-[#3dbdb4] text-white font-black text-xs rounded-2xl border-2 border-[#2D3436] shadow-[4px_4px_0px_0px_rgba(45,52,54,1)] transition flex items-center justify-center space-x-2"
        >
          <span>Next Card</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
