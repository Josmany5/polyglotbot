import React from 'react';
import {
  Globe,
  FolderHeart,
  Layers,
  Sparkles,
  Mic,
  Flame,
  BookmarkCheck,
  GraduationCap,
} from 'lucide-react';

export type TabType = 'curriculum' | 'translator' | 'phrasebook' | 'flashcards' | 'quiz' | 'speech' | 'slang';

interface HeaderProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  savedCount: number;
  masteredCount: number;
  onOpenStarterDeck?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  savedCount,
  masteredCount,
  onOpenStarterDeck,
}) => {
  const tabs: { id: TabType; label: string; icon: React.ReactNode; badge?: string }[] = [
    {
      id: 'translator',
      label: 'Translate & Tutor',
      icon: <Globe className="w-4 h-4" />,
    },
    {
      id: 'curriculum',
      label: 'Textbook Path',
      icon: <GraduationCap className="w-4 h-4 text-[#FF6B6B]" />,
    },
    {
      id: 'phrasebook',
      label: 'Phrasebook',
      icon: <FolderHeart className="w-4 h-4" />,
      badge: savedCount > 0 ? String(savedCount) : undefined,
    },
    {
      id: 'flashcards',
      label: 'Flashcards',
      icon: <Layers className="w-4 h-4" />,
    },
    {
      id: 'quiz',
      label: 'AI Quizzes',
      icon: <Sparkles className="w-4 h-4" />,
    },
    {
      id: 'speech',
      label: 'Speech Lab',
      icon: <Mic className="w-4 h-4" />,
    },
    {
      id: 'slang',
      label: 'Urban Slang Hub',
      icon: <Flame className="w-4 h-4" />,
    },
  ];

  return (
    <header className="bg-white border-b-4 border-[#FF6B6B] sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-3 gap-3">
          {/* Logo & Title */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('curriculum')}>
              <div className="w-11 h-11 bg-[#4ECDC4] border-2 border-[#2D3436] rounded-2xl flex items-center justify-center text-white text-2xl font-black italic shadow-[3px_3px_0px_0px_rgba(45,52,54,1)]">
                P
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-2xl font-black tracking-tight text-[#2D3436]">
                    POLYGLOT<span className="text-[#FF6B6B]">BOT</span>
                  </h1>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-[#FFE66D] text-[#2D3436] border-2 border-[#2D3436]">
                    AI TUTOR
                  </span>
                </div>
                <p className="text-xs font-medium text-[#636E72]">
                  Real-time translation, phonetics, slang & interactive tutor
                </p>
              </div>
            </div>

            {/* Quick Stats on Mobile */}
            <div className="flex md:hidden items-center space-x-2 text-xs font-bold text-[#2D3436]">
              <span className="flex items-center px-2.5 py-1 bg-[#4ECDC4]/20 border-2 border-[#2D3436] rounded-xl">
                <BookmarkCheck className="w-3.5 h-3.5 mr-1 text-[#2D3436]" />
                {savedCount}
              </span>
              <span className="flex items-center px-2.5 py-1 bg-[#FFE66D] border-2 border-[#2D3436] rounded-xl">
                <Flame className="w-3.5 h-3.5 mr-1 text-[#FF6B6B]" />
                {masteredCount}
              </span>
            </div>
          </div>

          {/* Desktop Stats Ticker */}
          <div className="hidden md:flex items-center space-x-3 text-xs">
            <div className="flex items-center px-3 py-1.5 bg-[#4ECDC4]/15 rounded-xl border-2 border-[#2D3436] text-[#2D3436]">
              <BookmarkCheck className="w-4 h-4 mr-1.5 text-[#2D3436]" />
              <span>
                Saved Phrases: <strong className="font-black text-[#2D3436]">{savedCount}</strong>
              </span>
            </div>
            <div className="flex items-center px-3 py-1.5 bg-[#FFE66D] text-[#2D3436] rounded-xl border-2 border-[#2D3436]">
              <Flame className="w-4 h-4 mr-1.5 text-[#FF6B6B]" />
              <span>
                Mastered: <strong className="font-black text-[#2D3436]">{masteredCount}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto py-2 scrollbar-none border-t-2 border-[#F0F2F5]">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 text-xs sm:text-sm font-bold rounded-full transition-all whitespace-nowrap border-2 ${
                  isActive
                    ? 'bg-[#2D3436] text-white border-[#2D3436] shadow-[3px_3px_0px_0px_rgba(255,107,107,1)]'
                    : 'bg-white text-[#2D3436] border-transparent hover:border-[#2D3436] hover:bg-[#F7F3E9]'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${
                      isActive
                        ? 'bg-[#FFE66D] text-[#2D3436] border-[#2D3436]'
                        : 'bg-[#FF6B6B] text-white border-[#2D3436]'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
