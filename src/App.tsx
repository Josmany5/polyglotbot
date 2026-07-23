import React, { useState, useEffect } from 'react';
import { Header, TabType } from './components/Header';
import { CurriculumTab } from './components/CurriculumTab';
import { TranslatorTab } from './components/TranslatorTab';
import { PhrasebookTab } from './components/PhrasebookTab';
import { FlashcardTab } from './components/FlashcardTab';
import { QuizTab } from './components/QuizTab';
import { SpeechLabTab } from './components/SpeechLabTab';
import { UrbanSlangHubTab } from './components/UrbanSlangHubTab';
import { SavePhraseModal } from './components/SavePhraseModal';
import { StarterDeckModal } from './components/StarterDeckModal';
import { TranslationResult, Folder, SavedPhrase, LanguageCode } from './types';
import { DEFAULT_FOLDERS, SAMPLE_SAVED_PHRASES } from './data/languages';
import { Check } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    try {
      const saved = localStorage.getItem('polyglotbot_active_tab');
      return (saved as TabType) || 'translator';
    } catch { return 'translator'; }
  });
  const [unlockedPackIds, setUnlockedPackIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('polyglotbot_unlocked_packs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Load persistent folders or default
  const [folders, setFolders] = useState<Folder[]>(() => {
    try {
      const saved = localStorage.getItem('polyglotbot_folders');
      return saved ? JSON.parse(saved) : DEFAULT_FOLDERS;
    } catch {
      return DEFAULT_FOLDERS;
    }
  });

  // Load persistent phrases or sample
  const [phrases, setPhrases] = useState<SavedPhrase[]>(() => {
    try {
      const saved = localStorage.getItem('polyglotbot_phrases');
      return saved ? JSON.parse(saved) : SAMPLE_SAVED_PHRASES;
    } catch {
      return SAMPLE_SAVED_PHRASES;
    }
  });

  // Modal State
  const [isSaveModalOpen, setIsSaveModalOpen] = useState<boolean>(false);
  const [isStarterDeckModalOpen, setIsStarterDeckModalOpen] = useState<boolean>(false);
  const [activeTranslationToSave, setActiveTranslationToSave] = useState<TranslationResult | null>(
    null
  );

  // Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Persist active tab
  useEffect(() => {
    try { localStorage.setItem('polyglotbot_active_tab', activeTab); } catch {}
  }, [activeTab]);

  useEffect(() => {
    try {
      localStorage.setItem('polyglotbot_folders', JSON.stringify(folders));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }, [folders]);

  useEffect(() => {
    try {
      localStorage.setItem('polyglotbot_phrases', JSON.stringify(phrases));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }, [phrases]);

  useEffect(() => {
    try {
      localStorage.setItem('polyglotbot_unlocked_packs', JSON.stringify(unlockedPackIds));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }, [unlockedPackIds]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleOpenSaveModal = (result: TranslationResult) => {
    setActiveTranslationToSave(result);
    setIsSaveModalOpen(true);
  };

  const handleSavePhrase = (
    folderId: string,
    notes: string,
    tags: string[],
    newFolderName?: string
  ) => {
    if (!activeTranslationToSave) return;

    let targetFolderId = folderId;

    if (newFolderName) {
      const newFolder: Folder = {
        id: `folder-${Date.now()}`,
        name: newFolderName,
        color: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200',
        icon: 'FolderHeart',
        createdAt: Date.now(),
      };
      setFolders((prev) => [...prev, newFolder]);
      targetFolderId = newFolder.id;
    }

    const newPhrase: SavedPhrase = {
      id: `phrase-${Date.now()}`,
      folderId: targetFolderId,
      sourceText: activeTranslationToSave.sourceText,
      translatedText: activeTranslationToSave.translatedText,
      sourceLang: activeTranslationToSave.sourceLang,
      targetLang: activeTranslationToSave.targetLang,
      phonetic: activeTranslationToSave.overallPhonetic,
      slangInsights: activeTranslationToSave.slangInsights,
      grammarNotes: activeTranslationToSave.grammarNotes,
      notes,
      masteryLevel: 'learning',
      tags,
      createdAt: Date.now(),
    };

    setPhrases((prev) => [newPhrase, ...prev]);
    showToast('Saved phrase to Phrasebook!');
  };

  const handleSaveSlangToPhrasebook = (
    phrase: string,
    meaning: string,
    targetLang: LanguageCode,
    culturalNote: string,
    phonetic: string
  ) => {
    const urbanFolder = folders.find((f) => f.name.includes('Urban')) || folders[0];
    const newPhrase: SavedPhrase = {
      id: `phrase-slang-${Date.now()}`,
      folderId: urbanFolder ? urbanFolder.id : folders[0].id,
      sourceText: meaning,
      translatedText: phrase,
      sourceLang: 'en',
      targetLang,
      phonetic,
      notes: culturalNote,
      masteryLevel: 'learning',
      tags: ['Urban Slang', 'Native Lingo'],
      createdAt: Date.now(),
    };

    setPhrases((prev) => [newPhrase, ...prev]);
    showToast(`Saved "${phrase}" to Phrasebook!`);
  };

  const handleAddFolder = (name: string, description?: string) => {
    const newFolder: Folder = {
      id: `folder-${Date.now()}`,
      name,
      description,
      color: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200',
      icon: 'FolderHeart',
      createdAt: Date.now(),
    };
    setFolders((prev) => [...prev, newFolder]);
    showToast(`Folder "${name}" created!`);
  };

  const handleDeleteFolder = (folderId: string) => {
    setFolders((prev) => prev.filter((f) => f.id !== folderId));
    setPhrases((prev) => prev.filter((p) => p.folderId !== folderId));
    showToast('Folder deleted.');
  };

  const handleDeletePhrase = (phraseId: string) => {
    setPhrases((prev) => prev.filter((p) => p.id !== phraseId));
    showToast('Phrase removed.');
  };

  const handleUpdateMastery = (
    phraseId: string,
    mastery: 'learning' | 'review' | 'mastered'
  ) => {
    setPhrases((prev) =>
      prev.map((p) => (p.id === phraseId ? { ...p, masteryLevel: mastery } : p))
    );
  };

  const handleAutoSavePhrase = (
    sourceText: string,
    translatedText: string,
    sourceLang: LanguageCode,
    targetLang: LanguageCode,
    phonetic?: string,
    notes?: string,
    tags: string[] = ['Translated']
  ) => {
    if (!sourceText || !translatedText || !sourceText.trim() || !translatedText.trim()) return;

    // Find translated folder or create fallback
    let translatedFolder = folders.find(
      (f) => f.id === 'folder-translated' || f.name.toLowerCase().includes('translated')
    );
    if (!translatedFolder && folders.length > 0) {
      translatedFolder = folders[0];
    }

    setPhrases((prev) => {
      // Avoid duplicate auto-saves of exact same translation
      const exists = prev.some(
        (p) =>
          p.translatedText.toLowerCase().trim() === translatedText.toLowerCase().trim() &&
          p.targetLang === targetLang
      );
      if (exists) return prev;

      const newPhrase: SavedPhrase = {
        id: `phrase-auto-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        folderId: translatedFolder?.id || 'folder-translated',
        sourceText: sourceText.trim(),
        translatedText: translatedText.trim(),
        sourceLang,
        targetLang,
        phonetic,
        notes: notes || 'Saved from real-time translator',
        masteryLevel: 'learning',
        tags: tags.includes('Translated') ? tags : ['Translated', ...tags],
        createdAt: Date.now(),
      };

      return [newPhrase, ...prev];
    });
  };

  const handleSaveQuickPracticeBatch = (
    practiceItems: {
      sourceText: string;
      translatedText: string;
      sourceLang: LanguageCode;
      targetLang: LanguageCode;
      phonetic: string;
      notes: string;
    }[]
  ) => {
    if (!practiceItems || practiceItems.length === 0) return;

    let qpFolder = folders.find(
      (f) => f.id === 'folder-quick-practice' || f.name.toLowerCase().includes('quick practice')
    );

    if (!qpFolder) {
      qpFolder = {
        id: `folder-qp-${Date.now()}`,
        name: 'Quick Practice Decks',
        description: 'Practice cards generated from Quick Practice session',
        color: 'bg-[#FFE66D]/20 text-[#2D3436] border-[#FFE66D]',
        icon: 'Sparkles',
        createdAt: Date.now(),
      };
      setFolders((prev) => [qpFolder!, ...prev]);
    }

    const newPhrases: SavedPhrase[] = practiceItems.map((item, idx) => ({
      id: `phrase-qp-${Date.now()}-${idx}`,
      folderId: qpFolder!.id,
      sourceText: item.sourceText,
      translatedText: item.translatedText,
      sourceLang: item.sourceLang,
      targetLang: item.targetLang,
      phonetic: item.phonetic,
      notes: item.notes || 'Generated from Quick Practice session',
      masteryLevel: 'learning',
      tags: ['Quick Practice', 'Generated'],
      createdAt: Date.now() - idx * 10,
    }));

    setPhrases((prev) => [...newPhrases, ...prev]);
    showToast(`Saved ${newPhrases.length} cards into "${qpFolder.name}" folder!`);
  };

  const handleImportPhrases = (imported: SavedPhrase[]) => {
    setPhrases((prev) => [...imported, ...prev]);
    showToast(`Imported ${imported.length} phrases to your Phrasebook!`);
  };

  const handleUnlockPack = (
    folderName: string,
    folderDesc: string,
    items: {
      sourceText: string;
      translatedText: string;
      sourceLang: LanguageCode;
      targetLang: LanguageCode;
      phonetic: string;
      notes: string;
      tags: string[];
    }[],
    packId?: string
  ) => {
    // Track pack as unlocked (state update runs first, guard runs second)
    if (packId) {
      let alreadyUnlocked = false;
      setUnlockedPackIds((prev) => {
        if (prev.includes(packId)) {
          alreadyUnlocked = true;
          return prev;
        }
        return [...prev, packId];
      });

      // Guard: don't re-create folder/phrases for already-unlocked packs
      if (alreadyUnlocked || unlockedPackIds.includes(packId)) {
        showToast('Pack already unlocked — scroll to your flashcards to study!');
        return;
      }
    }

    // Find existing folder by exact name match
    let targetFolder = folders.find((f) => f.name === folderName);
    let folderId = targetFolder?.id;

    if (!targetFolder) {
      folderId = `folder-pack-${Date.now()}`;
      targetFolder = {
        id: folderId,
        name: folderName,
        description: folderDesc,
        color: 'bg-emerald-500/10 text-emerald-800 border-emerald-300',
        icon: 'GraduationCap',
        createdAt: Date.now(),
      };
      setFolders((prev) => [targetFolder!, ...prev]);
    }

    // Add new phrases (deduplicate by checking existing phrase IDs)
    setPhrases((prev) => {
      const newPhrases: SavedPhrase[] = items
        .filter((item) =>
          !prev.some(
            (p) =>
              p.sourceText.toLowerCase().trim() === item.sourceText.toLowerCase().trim() &&
              p.targetLang === item.targetLang
          )
        )
        .map((item, idx) => ({
          id: `pack-item-${Date.now()}-${idx}`,
          folderId: folderId!,
          sourceText: item.sourceText,
          translatedText: item.translatedText,
          sourceLang: item.sourceLang,
          targetLang: item.targetLang,
          phonetic: item.phonetic,
          notes: item.notes,
          masteryLevel: 'learning' as const,
          tags: item.tags,
          createdAt: Date.now() - idx * 10,
        }));

      return [...newPhrases, ...prev];
    });

    showToast(`Unlocked "${folderName}"! ${items.length} cards added to Flashcards & Phrasebook.`);
  };

  const handleLoadStarterDeck = (newFolders: Folder[], newPhrases: SavedPhrase[]) => {
    setFolders((prev) => [...newFolders, ...prev]);
    setPhrases((prev) => [...newPhrases, ...prev]);
    showToast(`Loaded ${newPhrases.length} expressions across ${newFolders.length} levels!`);
  };

  const masteredCount = phrases.filter((p) => p.masteryLevel === 'mastered').length;

  return (
    <div className="min-h-screen bg-white text-[#2D3436] flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2 border border-slate-700 text-xs font-semibold animate-bounce">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* App Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        savedCount={phrases.length}
        masteredCount={masteredCount}
        onOpenStarterDeck={() => setIsStarterDeckModalOpen(true)}
      />

      {/* Main Tab Content */}
      <main className="flex-1 pb-12">
        {activeTab === 'curriculum' && (
          <CurriculumTab
            onUnlockPack={handleUnlockPack}
            unlockedPackIds={unlockedPackIds}
            savedPhrases={phrases}
          />
        )}

        {activeTab === 'translator' && (
          <TranslatorTab
            onSavePhraseClick={handleOpenSaveModal}
            onAutoSavePhrase={handleAutoSavePhrase}
            onSaveQuickPracticeBatch={handleSaveQuickPracticeBatch}
            folders={folders}
          />
        )}

        {activeTab === 'phrasebook' && (
          <PhrasebookTab
            phrases={phrases}
            folders={folders}
            onAddFolder={handleAddFolder}
            onDeleteFolder={handleDeleteFolder}
            onDeletePhrase={handleDeletePhrase}
            onUpdateMastery={handleUpdateMastery}
            onImportPhrases={handleImportPhrases}
            onOpenStarterDeck={() => setIsStarterDeckModalOpen(true)}
          />
        )}

        {activeTab === 'flashcards' && (
          <FlashcardTab
            phrases={phrases}
            folders={folders}
            onUpdateMastery={handleUpdateMastery}
          />
        )}

        {activeTab === 'quiz' && <QuizTab phrases={phrases} />}

        {activeTab === 'speech' && <SpeechLabTab phrases={phrases} />}

        {activeTab === 'slang' && (
          <UrbanSlangHubTab
            onSaveSlangToPhrasebook={handleSaveSlangToPhrasebook}
            folders={folders}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 Polyglotbot — AI Powered Language Tutor & Real-time Translation Engine</p>
          <div className="flex items-center space-x-4">
            <button onClick={() => setActiveTab('translator')} className="hover:underline">
              Translator
            </button>
            <button onClick={() => setActiveTab('slang')} className="hover:underline">
              Urban Slang
            </button>
            <button onClick={() => setActiveTab('quiz')} className="hover:underline">
              AI Quizzes
            </button>
          </div>
        </div>
      </footer>

      {/* Save Phrase Modal */}
      {activeTranslationToSave && (
        <SavePhraseModal
          isOpen={isSaveModalOpen}
          onClose={() => setIsSaveModalOpen(false)}
          onSave={handleSavePhrase}
          folders={folders}
          sourceText={activeTranslationToSave.sourceText}
          translatedText={activeTranslationToSave.translatedText}
          phonetic={activeTranslationToSave.overallPhonetic}
          sourceLang={activeTranslationToSave.sourceLang}
          targetLang={activeTranslationToSave.targetLang}
        />
      )}

      {/* Starter Level Decks Modal */}
      <StarterDeckModal
        isOpen={isStarterDeckModalOpen}
        onClose={() => setIsStarterDeckModalOpen(false)}
        onLoadDeck={handleLoadStarterDeck}
      />
    </div>
  );
}
