import React, { useState } from 'react';
import { SavedPhrase, Folder, LanguageCode } from '../types';
import { LANGUAGES } from '../data/languages';
import { playTextToSpeech } from '../utils/audio';
import {
  FolderHeart,
  Search,
  Volume2,
  Trash2,
  Tag,
  Plus,
  Download,
  Upload,
} from 'lucide-react';

interface PhrasebookTabProps {
  phrases: SavedPhrase[];
  folders: Folder[];
  onAddFolder: (name: string, description?: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onDeletePhrase: (phraseId: string) => void;
  onUpdateMastery: (phraseId: string, mastery: 'learning' | 'review' | 'mastered') => void;
  onImportPhrases: (imported: SavedPhrase[]) => void;
  onOpenStarterDeck?: () => void;
}

export const PhrasebookTab: React.FC<PhrasebookTabProps> = ({
  phrases,
  folders,
  onAddFolder,
  onDeleteFolder,
  onDeletePhrase,
  onUpdateMastery,
  onImportPhrases,
  onOpenStarterDeck,
}) => {
  const [activeFolderId, setActiveFolderId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLang, setSelectedLang] = useState<string>('all');
  const [showNewFolderModal, setShowNewFolderModal] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [newFolderDesc, setNewFolderDesc] = useState<string>('');
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);

  const activeFolder = folders.find((f) => f.id === activeFolderId);

  const filteredPhrases = phrases.filter((p) => {
    const matchesFolder = activeFolderId === 'all' || p.folderId === activeFolderId;
    const matchesLang = selectedLang === 'all' || p.targetLang === selectedLang;
    const matchesSearch =
      p.sourceText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.translatedText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.phonetic?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesFolder && matchesLang && matchesSearch;
  });

  const handlePlayAudio = (phrase: SavedPhrase) => {
    playTextToSpeech(phrase.translatedText, phrase.targetLang);
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(phrases, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `polyglotbot_phrasebook_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (Array.isArray(parsed)) {
            onImportPhrases(parsed);
          }
        } catch (err) {
          alert('Invalid JSON phrasebook file.');
        }
      };
    }
  };

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    onAddFolder(newFolderName.trim(), newFolderDesc.trim());
    setNewFolderName('');
    setNewFolderDesc('');
    setShowNewFolderModal(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-[28px] border-4 border-[#2D3436] shadow-[8px_8px_0px_0px_rgba(45,52,54,1)]">
        <div>
          <h2 className="text-2xl font-black text-[#2D3436] flex items-center space-x-2">
            <FolderHeart className="w-7 h-7 text-[#FF6B6B]" />
            <span>Personal Language Phrasebook</span>
          </h2>
          <p className="text-xs font-bold text-[#636E72] mt-1">
            Organize phrases into custom folders, practice phonetics, track mastery, and export
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowNewFolderModal(true)}
            className="px-4 py-2.5 text-xs font-extrabold text-white bg-[#FF6B6B] hover:bg-[#ff5252] rounded-xl border-2 border-[#2D3436] shadow-[3px_3px_0px_0px_rgba(45,52,54,1)] transition flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>New Folder</span>
          </button>

          <button
            onClick={handleExportJSON}
            className="px-3.5 py-2.5 text-xs font-extrabold text-[#2D3436] bg-[#FFE66D] hover:bg-[#ffd738] rounded-xl border-2 border-[#2D3436] shadow-[3px_3px_0px_0px_rgba(45,52,54,1)] transition flex items-center space-x-1.5"
            title="Export JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>

          <label
            className="px-3.5 py-2.5 text-xs font-extrabold text-[#2D3436] bg-[#4ECDC4] hover:bg-[#3dbdb4] text-white rounded-xl border-2 border-[#2D3436] shadow-[3px_3px_0px_0px_rgba(45,52,54,1)] transition flex items-center space-x-1.5 cursor-pointer"
            title="Import JSON"
          >
            <Upload className="w-3.5 h-3.5 text-white" />
            <span className="hidden sm:inline">Import</span>
            <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
          </label>
        </div>
      </div>

      {/* Main Grid: Left Folders Sidebar + Right Phrase List */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left Column: Folders */}
        <div className="md:col-span-1 space-y-3">
          <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-[#636E72]">
            <span>Folders & Lists</span>
            <span>{folders.length}</span>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => {
                setActiveFolderId('all');
                setSelectedLang('all');
              }}
              className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-xs font-black transition border-2 ${
                activeFolderId === 'all'
                  ? 'bg-[#2D3436] text-white border-[#2D3436] shadow-[4px_4px_0px_0px_rgba(255,107,107,1)]'
                  : 'bg-white text-[#2D3436] border-[#2D3436] shadow-[3px_3px_0px_0px_rgba(45,52,54,1)] hover:bg-[#F7F3E9]'
              }`}
            >
              <div className="flex items-center space-x-2">
                <FolderHeart className="w-4 h-4 text-[#FF6B6B]" />
                <span>All Saved Phrases</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#FFE66D] text-[#2D3436] border border-[#2D3436]">
                {phrases.length}
              </span>
            </button>

            {folders.map((folder) => {
              const count = phrases.filter((p) => p.folderId === folder.id).length;
              const isSelected = activeFolderId === folder.id;

              return (
                <div
                  key={folder.id}
                  className={`group flex items-center justify-between p-3.5 rounded-2xl text-xs font-black transition cursor-pointer border-2 ${
                    isSelected
                      ? 'bg-[#2D3436] text-white border-[#2D3436] shadow-[4px_4px_0px_0px_rgba(78,205,196,1)]'
                      : 'bg-white text-[#2D3436] border-[#2D3436] shadow-[3px_3px_0px_0px_rgba(45,52,54,1)] hover:bg-[#F7F3E9]'
                  }`}
                  onClick={() => {
                    setActiveFolderId(folder.id);
                    setSelectedLang('all');
                  }}
                >
                  <div className="flex items-center space-x-2 truncate pr-2">
                    <FolderHeart className="w-4 h-4 shrink-0 text-[#4ECDC4]" />
                    <span className="truncate">{folder.name}</span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#F7F3E9] text-[#2D3436] border border-[#2D3436]">
                      {count}
                    </span>
                    {folder.id !== 'folder-greetings' && folder.id !== 'folder-urban' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setFolderToDelete(folder);
                        }}
                        className="p-1 text-rose-600 hover:bg-rose-100 rounded-lg transition border border-rose-300"
                        title={`Delete folder ${folder.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active Folder Banner + Search + Phrases List */}
        <div className="md:col-span-3 space-y-4">
          {/* Active Folder Header Banner */}
          {activeFolder && (
            <div className="p-4 sm:p-5 bg-white rounded-2xl border-3 border-[#2D3436] shadow-[6px_6px_0px_0px_rgba(45,52,54,1)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <FolderHeart className="w-5 h-5 text-[#FF6B6B]" />
                  <h3 className="text-xl font-black text-[#2D3436]">{activeFolder.name}</h3>
                  <span className="px-2.5 py-0.5 bg-[#FFE66D] text-[#2D3436] text-xs font-black rounded-full border border-[#2D3436]">
                    {phrases.filter((p) => p.folderId === activeFolder.id).length} Saved Items
                  </span>
                </div>
                {activeFolder.description && (
                  <p className="text-xs font-bold text-[#636E72] pl-7">{activeFolder.description}</p>
                )}
              </div>

              {activeFolder.id !== 'folder-greetings' && activeFolder.id !== 'folder-urban' && (
                <button
                  onClick={() => setFolderToDelete(activeFolder)}
                  className="px-3.5 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-black text-xs border-2 border-[#2D3436] shadow-[2px_2px_0px_0px_rgba(45,52,54,1)] transition flex items-center space-x-1.5 shrink-0 self-start sm:self-auto"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Folder</span>
                </button>
              )}
            </div>
          )}
          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Search Input */}
            <div className="sm:col-span-2 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search saved phrases, phonetics, tags..."
                className="w-full pl-10 pr-4 py-2.5 text-xs font-bold rounded-2xl border-2 border-[#2D3436] bg-white text-[#2D3436] shadow-[3px_3px_0px_0px_rgba(45,52,54,1)] outline-none"
              />
              <Search className="w-4 h-4 text-[#2D3436] absolute left-3.5 top-3" />
            </div>

            {/* Language Filter */}
            <select
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs font-extrabold rounded-2xl border-2 border-[#2D3436] bg-[#FFE66D] text-[#2D3436] shadow-[3px_3px_0px_0px_rgba(45,52,54,1)] outline-none cursor-pointer"
            >
              <option value="all">All Target Languages ({phrases.length})</option>
              {LANGUAGES.map((l) => {
                const count = phrases.filter((p) => p.targetLang === l.code).length;
                return (
                  <option key={l.code} value={l.code}>
                    {l.flag} {l.name} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Language Quick Filter Chips */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedLang('all')}
              className={`px-3 py-1.5 rounded-xl border-2 border-[#2D3436] text-xs font-black transition whitespace-nowrap shadow-[2px_2px_0px_0px_rgba(45,52,54,1)] ${
                selectedLang === 'all'
                  ? 'bg-[#2D3436] text-white'
                  : 'bg-white text-[#2D3436] hover:bg-[#FFE66D]'
              }`}
            >
              🌐 All ({phrases.length})
            </button>
            {LANGUAGES.filter((l) => phrases.some((p) => p.targetLang === l.code)).map((l) => {
              const count = phrases.filter((p) => p.targetLang === l.code).length;
              return (
                <button
                  key={l.code}
                  onClick={() => setSelectedLang(l.code)}
                  className={`px-3 py-1.5 rounded-xl border-2 border-[#2D3436] text-xs font-black transition whitespace-nowrap shadow-[2px_2px_0px_0px_rgba(45,52,54,1)] ${
                    selectedLang === l.code
                      ? 'bg-[#4ECDC4] text-white'
                      : 'bg-white text-[#2D3436] hover:bg-[#4ECDC4]/20'
                  }`}
                >
                  {l.flag} {l.name} ({count})
                </button>
              );
            })}
          </div>

          {/* Phrases Cards List */}
          {filteredPhrases.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {filteredPhrases.map((phrase) => {
                const langInfo = LANGUAGES.find((l) => l.code === phrase.targetLang);

                return (
                  <div
                    key={phrase.id}
                    className="p-5 bg-white rounded-3xl border-3 border-[#2D3436] shadow-[6px_6px_0px_0px_rgba(45,52,54,1)] transition space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#4ECDC4] text-white border border-[#2D3436]">
                            {langInfo?.flag} {langInfo?.name}
                          </span>

                          <select
                            value={phrase.masteryLevel}
                            onChange={(e) =>
                              onUpdateMastery(phrase.id, e.target.value as any)
                            }
                            className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-[#2D3436] outline-none ${
                              phrase.masteryLevel === 'mastered'
                                ? 'bg-[#FFE66D] text-[#2D3436]'
                                : phrase.masteryLevel === 'review'
                                ? 'bg-[#FF6B6B] text-white'
                                : 'bg-white text-[#2D3436]'
                            }`}
                          >
                            <option value="learning">📖 Learning</option>
                            <option value="review">⚡ Reviewing</option>
                            <option value="mastered">✅ Mastered</option>
                          </select>
                        </div>

                        {/* Translated Target Phrase */}
                        <h3 className="text-xl font-extrabold text-[#2D3436]">
                          {phrase.translatedText}
                        </h3>

                        {/* Phonetics */}
                        {phrase.phonetic && (
                          <p className="text-xs font-mono font-bold text-[#FF6B6B]">
                            [{phrase.phonetic}]
                          </p>
                        )}

                        {/* Source Meaning */}
                        <p className="text-xs font-medium text-[#636E72]">
                          English: "{phrase.sourceText}"
                        </p>
                      </div>

                      <div className="flex items-center space-x-1 shrink-0">
                        <button
                          onClick={() => handlePlayAudio(phrase)}
                          className="w-10 h-10 rounded-xl bg-[#4ECDC4] text-white border-2 border-[#2D3436] shadow-[2px_2px_0px_0px_rgba(45,52,54,1)] hover:bg-[#3dbdb4] transition flex items-center justify-center"
                          title="Play Audio"
                        >
                          <Volume2 className="w-5 h-5" />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Delete this saved phrase?')) {
                              onDeletePhrase(phrase.id);
                            }
                          }}
                          className="w-10 h-10 rounded-xl bg-white text-[#2D3436] border-2 border-[#2D3436] shadow-[2px_2px_0px_0px_rgba(45,52,54,1)] hover:bg-rose-500 hover:text-white transition flex items-center justify-center shrink-0"
                          title="Delete phrase"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Notes & Tags */}
                    {phrase.notes && (
                      <p className="text-xs font-medium text-[#2D3436] bg-[#F7F3E9] p-3 rounded-2xl border-2 border-[#2D3436]">
                        <strong>Note:</strong> {phrase.notes}
                      </p>
                    )}

                    {phrase.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {phrase.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FFE66D] text-[#2D3436] border border-[#2D3436]"
                          >
                            <Tag className="w-3 h-3 mr-1 text-[#2D3436]" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center bg-white rounded-3xl border-4 border-[#2D3436] shadow-[8px_8px_0px_0px_rgba(45,52,54,1)] space-y-3">
              <FolderHeart className="w-12 h-12 mx-auto text-[#FF6B6B]" />
              <p className="text-base font-extrabold text-[#2D3436]">
                No saved phrases found in this folder or filter.
              </p>
              <p className="text-xs font-bold text-[#636E72] max-w-sm mx-auto">
                Go to the <strong>Translate & Tutor</strong> tab, translate any phrase you want to learn, and click "Save to Folder"!
              </p>
              {activeFolderId !== 'all' && (
                <button
                  onClick={() => setActiveFolderId('all')}
                  className="px-5 py-2.5 text-xs font-black bg-[#4ECDC4] text-white rounded-xl border-2 border-[#2D3436] shadow-[3px_3px_0px_0px_rgba(45,52,54,1)] hover:bg-[#3dbdb4] transition"
                >
                  ← Back to All Folders
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2D3436]/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border-4 border-[#2D3436] shadow-[12px_12px_0px_0px_rgba(45,52,54,1)] max-w-md w-full p-6 space-y-4">
            <h3 className="text-xl font-black text-[#2D3436]">Create New Folder</h3>
            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-[#636E72] mb-1">
                  Folder Name
                </label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g., Greek Street Slang, Athens Trip"
                  className="w-full px-4 py-2.5 text-sm font-bold rounded-xl border-2 border-[#2D3436] bg-[#F7F3E9] text-[#2D3436] outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-[#636E72] mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={newFolderDesc}
                  onChange={(e) => setNewFolderDesc(e.target.value)}
                  placeholder="e.g., Slang phrases for conversing with friends"
                  className="w-full px-4 py-2.5 text-sm font-bold rounded-xl border-2 border-[#2D3436] bg-[#F7F3E9] text-[#2D3436] outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewFolderModal(false)}
                  className="px-4 py-2 text-xs font-black text-[#2D3436] hover:underline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-black text-white bg-[#FF6B6B] hover:bg-[#ff5252] rounded-xl border-2 border-[#2D3436] shadow-[3px_3px_0px_0px_rgba(45,52,54,1)]"
                >
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Folder Confirmation Modal */}
      {folderToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2D3436]/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border-4 border-[#2D3436] shadow-[12px_12px_0px_0px_rgba(45,52,54,1)] max-w-md w-full p-6 space-y-4">
            <h3 className="text-xl font-black text-[#2D3436]">Delete Folder</h3>
            <p className="text-sm font-bold text-[#2D3436]">
              Are you sure you want to delete "<strong>{folderToDelete.name}</strong>"? All phrases inside this folder will also be removed.
            </p>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setFolderToDelete(null)}
                className="px-4 py-2.5 text-xs font-black text-[#2D3436] hover:underline"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteFolder(folderToDelete.id);
                  if (activeFolderId === folderToDelete.id) setActiveFolderId('all');
                  setFolderToDelete(null);
                }}
                className="px-5 py-2.5 text-xs font-black text-white bg-rose-500 hover:bg-rose-600 rounded-xl border-2 border-[#2D3436] shadow-[3px_3px_0px_0px_rgba(45,52,54,1)]"
              >
                Yes, Delete Folder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
