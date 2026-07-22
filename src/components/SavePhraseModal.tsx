import React, { useState } from 'react';
import { Folder, LanguageCode } from '../types';
import { FolderHeart, Plus, Check, X, Tag } from 'lucide-react';

interface SavePhraseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (folderId: string, notes: string, tags: string[], newFolderName?: string) => void;
  folders: Folder[];
  sourceText: string;
  translatedText: string;
  phonetic: string;
  sourceLang: LanguageCode;
  targetLang: LanguageCode;
}

export const SavePhraseModal: React.FC<SavePhraseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  folders,
  sourceText,
  translatedText,
  phonetic,
}) => {
  const [selectedFolderId, setSelectedFolderId] = useState<string>(folders[0]?.id || '');
  const [isCreatingFolder, setIsCreatingFolder] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [tagInput, setTagInput] = useState<string>('');
  const [tags, setTags] = useState<string[]>(['Tutor Saved']);

  if (!isOpen) return null;

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreatingFolder && !newFolderName.trim()) return;

    onSave(
      selectedFolderId,
      notes,
      tags,
      isCreatingFolder ? newFolderName.trim() : undefined
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2D3436]/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-[28px] border-4 border-[#2D3436] shadow-[12px_12px_0px_0px_rgba(45,52,54,1)] max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-[#2D3436] bg-[#FFE66D]">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-white border-2 border-[#2D3436] text-[#2D3436] flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(45,52,54,1)]">
              <FolderHeart className="w-4 h-4 text-[#FF6B6B]" />
            </div>
            <h2 className="text-lg font-black text-[#2D3436]">Save to Phrasebook</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#2D3436] hover:bg-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Preview Card */}
          <div className="p-4 bg-[#F7F3E9] rounded-2xl border-2 border-[#2D3436] shadow-[3px_3px_0px_0px_rgba(45,52,54,1)] space-y-1 text-sm">
            <p className="font-extrabold text-[#2D3436] text-base">{translatedText}</p>
            {phonetic && <p className="text-xs text-[#FF6B6B] font-mono font-bold">[{phonetic}]</p>}
            <p className="text-xs text-[#636E72] font-medium">"{sourceText}"</p>
          </div>

          {/* Folder Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-black uppercase text-[#636E72]">
                Select Folder
              </label>
              <button
                type="button"
                onClick={() => setIsCreatingFolder(!isCreatingFolder)}
                className="text-xs text-[#FF6B6B] hover:underline font-extrabold"
              >
                {isCreatingFolder ? 'Select Existing Folder' : '+ Create New Folder'}
              </button>
            </div>

            {isCreatingFolder ? (
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name (e.g., Greek Slang, Greek Vacation)"
                className="w-full px-3.5 py-2 text-sm font-bold rounded-xl border-2 border-[#2D3436] bg-[#F7F3E9] text-[#2D3436] outline-none"
                required
              />
            ) : (
              <select
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
                className="w-full px-3.5 py-2 text-sm font-extrabold rounded-xl border-2 border-[#2D3436] bg-[#FFE66D] text-[#2D3436] shadow-[2px_2px_0px_0px_rgba(45,52,54,1)] outline-none cursor-pointer"
              >
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Learning Notes */}
          <div>
            <label className="block text-xs font-black uppercase text-[#636E72] mb-1.5">
              Personal Learning Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Use when talking casually with young locals, super common in Athens!"
              rows={2}
              className="w-full px-3.5 py-2 text-sm font-bold rounded-xl border-2 border-[#2D3436] bg-[#F7F3E9] text-[#2D3436] outline-none resize-none"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-black uppercase text-[#636E72] mb-1.5">
              Tags
            </label>
            <div className="flex items-center space-x-2 mb-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Add a tag (e.g. Slang, Priority)"
                  className="w-full pl-8 pr-3 py-1.5 text-xs font-bold rounded-xl border-2 border-[#2D3436] bg-[#F7F3E9] text-[#2D3436] outline-none"
                />
                <Tag className="w-3.5 h-3.5 text-[#2D3436] absolute left-2.5 top-2.5" />
              </div>
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3.5 py-1.5 text-xs font-black bg-[#4ECDC4] text-white rounded-xl border-2 border-[#2D3436] shadow-[2px_2px_0px_0px_rgba(45,52,54,1)] hover:bg-[#3dbdb4]"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black bg-[#FFE66D] text-[#2D3436] border border-[#2D3436]"
                >
                  #{t}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(t)}
                    className="ml-1 text-[#2D3436] hover:text-[#FF6B6B]"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-black text-[#2D3436] hover:underline"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-black text-white bg-[#FF6B6B] hover:bg-[#ff5252] rounded-xl border-2 border-[#2D3436] shadow-[3px_3px_0px_0px_rgba(45,52,54,1)] transition flex items-center space-x-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Save to Folder</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
