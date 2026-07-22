import React, { useState } from 'react';
import { Folder, SavedPhrase, LanguageCode } from '../types';
import { LANGUAGES } from '../data/languages';
import { Sparkles, X, Check, BookOpen, Flame, Compass, MessageSquare, Layers } from 'lucide-react';

interface StarterDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadDeck: (folders: Folder[], phrases: SavedPhrase[]) => void;
}

export const StarterDeckModal: React.FC<StarterDeckModalProps> = ({
  isOpen,
  onClose,
  onLoadDeck,
}) => {
  const [selectedLang, setSelectedLang] = useState<LanguageCode>('el');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleGenerateAndLoad = async () => {
    setIsLoading(true);
    const langObj = LANGUAGES.find((l) => l.code === selectedLang) || LANGUAGES[11]; // default Greek

    try {
      const response = await fetch('/api/generate-starter-deck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetLang: selectedLang, langName: langObj.name }),
      });

      if (!response.ok) throw new Error('Failed to generate starter deck.');

      const data = await response.json();
      const levels = data.levels || [];

      const newFolders: Folder[] = [];
      const newPhrases: SavedPhrase[] = [];

      const levelIcons = ['MessageSquare', 'Compass', 'BookOpen', 'Flame'];
      const levelColors = [
        'bg-emerald-500/10 text-emerald-700 border-emerald-200',
        'bg-blue-500/10 text-blue-700 border-blue-200',
        'bg-amber-500/10 text-amber-700 border-amber-200',
        'bg-purple-500/10 text-purple-700 border-purple-200',
      ];

      levels.forEach((lvl: any, idx: number) => {
        const folderId = `folder-${selectedLang}-lvl${lvl.levelNumber}-${Date.now()}`;
        const folder: Folder = {
          id: folderId,
          name: `${langObj.flag} ${langObj.name} - ${lvl.levelTitle}`,
          description: lvl.description,
          color: levelColors[idx % levelColors.length],
          icon: levelIcons[idx % levelIcons.length],
          createdAt: Date.now() - idx * 1000,
        };
        newFolders.push(folder);

        if (Array.isArray(lvl.items)) {
          lvl.items.forEach((item: any, itemIdx: number) => {
            const phrase: SavedPhrase = {
              id: `phrase-${selectedLang}-lvl${lvl.levelNumber}-${itemIdx}-${Date.now()}`,
              folderId,
              sourceText: item.sourceText,
              translatedText: item.translatedText,
              sourceLang: 'en',
              targetLang: selectedLang,
              phonetic: item.phonetic,
              notes: item.grammarNote,
              masteryLevel: 'learning',
              tags: [langObj.name, `Level ${lvl.levelNumber}`, ...(item.tags || [])],
              createdAt: Date.now() - itemIdx * 1000,
            };
            newPhrases.push(phrase);
          });
        }
      });

      onLoadDeck(newFolders, newPhrases);
      onClose();
    } catch (err) {
      console.error('Error generating starter deck:', err);
      alert('Could not generate deck at this moment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const currentLangObj = LANGUAGES.find((l) => l.code === selectedLang) || LANGUAGES[11];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2D3436]/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-[32px] border-4 border-[#2D3436] shadow-[12px_12px_0px_0px_rgba(45,52,54,1)] max-w-lg w-full overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b-3 border-[#2D3436] bg-[#FFE66D]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white border-2 border-[#2D3436] flex items-center justify-center text-[#2D3436] shadow-[2px_2px_0px_0px_rgba(45,52,54,1)]">
              <Sparkles className="w-5 h-5 text-[#FF6B6B]" />
            </div>
            <div>
              <h2 className="text-xl font-black text-[#2D3436]">Mastery Starter Decks</h2>
              <p className="text-xs font-bold text-[#636E72]">Load 4 Levels of Core Words, Travel & Grammar</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#2D3436] hover:bg-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Select Target Language */}
          <div className="space-y-2">
            <label className="block text-xs font-black uppercase text-[#636E72]">
              Choose Target Language
            </label>
            <select
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value as LanguageCode)}
              className="w-full px-4 py-3 text-sm font-black rounded-2xl border-3 border-[#2D3436] bg-[#F7F3E9] text-[#2D3436] shadow-[3px_3px_0px_0px_rgba(45,52,54,1)] outline-none cursor-pointer"
            >
              {LANGUAGES.filter((l) => l.code !== 'auto' && l.code !== 'en').map((l) => (
                <option key={l.code} value={l.code}>
                  {l.flag} {l.name} ({l.nativeName})
                </option>
              ))}
            </select>
          </div>

          {/* Level Preview Roadmap */}
          <div className="space-y-2.5">
            <p className="text-xs font-black uppercase text-[#2D3436] tracking-wider">
              Included Curriculum Levels ({currentLangObj.flag} {currentLangObj.name}):
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs font-black">
              <div className="p-3 bg-emerald-100 rounded-xl border-2 border-[#2D3436] shadow-[2px_2px_0px_0px_rgba(45,52,54,1)]">
                <span className="text-emerald-800">🟢 Level 1</span>
                <p className="text-[11px] font-bold text-[#636E72]">Greetings & Essentials</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl border-2 border-[#2D3436] shadow-[2px_2px_0px_0px_rgba(45,52,54,1)]">
                <span className="text-blue-800">🟡 Level 2</span>
                <p className="text-[11px] font-bold text-[#636E72]">Travel & Dining</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-xl border-2 border-[#2D3436] shadow-[2px_2px_0px_0px_rgba(45,52,54,1)]">
                <span className="text-amber-800">🟠 Level 3</span>
                <p className="text-[11px] font-bold text-[#636E72]">Conversations & Grammar</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl border-2 border-[#2D3436] shadow-[2px_2px_0px_0px_rgba(45,52,54,1)]">
                <span className="text-purple-800">🔴 Level 4</span>
                <p className="text-[11px] font-bold text-[#636E72]">Native Slang & Idioms</p>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2.5 text-xs font-black text-[#2D3436] hover:underline"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerateAndLoad}
              disabled={isLoading}
              className="px-6 py-3 text-xs font-black text-white bg-[#4ECDC4] hover:bg-[#3dbdb4] rounded-2xl border-3 border-[#2D3436] shadow-[4px_4px_0px_0px_rgba(45,52,54,1)] transition flex items-center space-x-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Building Starter Deck...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Load {currentLangObj.name} Starter Deck</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
