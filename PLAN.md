# Polyglotbot Restructure Plan

## Tab Structure (final)

```
[TRANSLATOR]  [TEXTBOOK]  [CLASSROOM]  [SETTINGS]
```

| Tab | Purpose |
|---|---|
| **Translator** | Pure translation — quick lookup, auto-saves to Textbook |
| **Textbook** | Learn — core packs in units, grammar lessons, custom packs, quick translations |
| **Classroom** | Study & test — flashcards, quizzes, speech, tutor (Gemini Live) |
| **Settings** | Preferences, language defaults, progress stats |

## File Changes Overview

### Files to modify
- `src/App.tsx` — new tabs, remove old references (SpeechLab, UrbanSlang, StarterDeck, Phrasebook)
- `src/components/Header.tsx` — 4 tabs instead of 7
- `src/components/CurriculumTab.tsx` → rename to `TextbookTab.tsx` + major restructure
- `src/components/TranslatorTab.tsx` — strip enrichment, keep pure translation
- `src/components/PhrasebookTab.tsx` — content merges into TextbookTab (deprecate this file)
- `src/components/FlashcardTab.tsx` — merges into ClassroomTab
- `src/components/QuizTab.tsx` — merges into ClassroomTab
- `src/components/SpeechLabTab.tsx` — merges into ClassroomTab (deprecate)
- `src/components/UrbanSlangHubTab.tsx` — remove
- `src/components/StarterDeckModal.tsx` — remove
- `src/server.ts` — add Google Translate endpoint for translator
- `src/data/corePhrases.ts` — may need unit assignments
- `README.md` — update with new structure

### New files to create
- `src/components/ClassroomTab.tsx` — 4-mode classroom (Flashcards, Quizzes, Speech, Tutor)
- `src/components/SettingsTab.tsx` — preferences + progress
- `src/utils/progressStore.ts` — track completed lessons, quiz scores, flashcards done

### Files to remove
- `src/components/QuizTab.tsx`
- `src/components/SpeechLabTab.tsx`
- `src/components/UrbanSlangHubTab.tsx`
- `src/components/StarterDeckModal.tsx`
- `src/components/FlashcardTab.tsx` (logically merges — can keep if easier)

---

## Phase 1: Foundation — Clean up existing tabs

### Step 1.1 — Remove unused components from App.tsx
- Remove SpeechLabTab, UrbanSlangHubTab imports
- Remove StarterDeckModal import and all references
- Remove `onLoadStarterDeck`, `handleLoadStarterDeck`
- Remove Speech Lab, Urban Slang, StarterDeck state and handlers
- Remove `isSaveModalOpen`, `activeTranslationToSave` (no more SavePhraseModal flow)

### Step 1.2 — Update Header.tsx
- Change tabs from 7 → 4: Translator, Textbook, Classroom, Settings
- Remove Speech Lab, Urban Slang Hub, Flashcards, Quiz, Phrasebook from header
- Rename "Translate & Tutor" → "Translator"
- Rename "Curriculum Tab" → "Textbook"
- Rename new tab "Classroom" (label: "Classroom 🎓")
- Add "Settings" tab

### Step 1.3 — Rename CurriculumTab → TextbookTab
- Rename file: `CurriculumTab.tsx` → `TextbookTab.tsx`
- Rename component: `CurriculumTab` → `TextbookTab`
- Rename props/interface to match
- Update import in App.tsx

---

## Phase 2: Translator — Pure translation

### Step 2.1 — Strip enrichment from TranslatorTab
- Remove word breakdown tab (words/slang/grammar toggle)
- Remove `activeAnalysisTab` state
- Remove slang insights rendering
- Remove grammar notes rendering
- Remove alternative translations rendering
- Remove `sentences` / `wordBreakdown` from rendered output
- Keep: translated text, phonetic, audio play, copy, save button
- Keep: Quick Practice "inspiration" bar (smaller, moved below)
- Keep: auto-translate (800ms debounce)
- Keep: language selector swap

### Step 2.2 — Add Google Translate fallback for translation
- On `/api/translate`: first call Google Translate (free, instant)
- Then call Gemini for enrichment in background
- Show Google result immediately, enrichment stored to pack
- Server change: add Google Translate proxy to `server.ts`

### Step 2.3 — Auto-save translations to Textbook "Quick Translations" pack
- Every translation auto-saves to a special pack in Textbook
- Max 100 entries, oldest drops off
- Create pack in localStorage: `polyglotbot_quick_translations`

---

## Phase 3: Textbook — Restructured learning hub

### Step 3.1 — Organize core packs into units
- 40 packs grouped into ~8 units (5 packs per unit)
- Each unit has a theme:
  - Unit 1: Foundations (Packs 1-5)
  - Unit 2: Getting Around (Packs 6-10)
  - Unit 3: Daily Life (Packs 11-15)
  - Unit 4: Connections (Packs 16-20)
  - Unit 5: Social (Packs 21-25)
  - Unit 6: Lifestyle (Packs 26-30)
  - Unit 7: Professional (Packs 31-35)
  - Unit 8: Advanced (Packs 36-40)

### Step 3.2 — Add AI-generated grammar lessons per unit
- Each unit gets an AI-generated grammar lesson
- Lesson stored in `localStorage` (per language + unit)
- Lesson content: grammar rule explanation, examples, exceptions
- Lesson generated on first visit to that unit
- Cache key: `polyglot_grammar_lesson_${lang}_unit_${n}`

### Step 3.3 — Add "Custom Packs" section
- "Create Custom Pack" button at top of Textbook
- Modal: name your pack, paste English phrases (one per line)
- Click "Translate & Save" → batch-translate all → create pack
- Pack appears in "⭐ My Custom Packs" section

### Step 3.4 — Add "Quick Translations" section
- Auto-populated from Translator saves
- Shows last 100 translations
- Each has same enrichment view as core packs

### Step 3.5 — Textbook per-pack view
- Click any unlocked pack → opens detail view
- Shows all 25 phrases in compact list
- Each phrase has: translation, phonetic, audio, expand for enrichment
- Enrichment panel per phrase: word breakdown, use-in-sentence, formality, synonyms, grammar note, slang
- **Action buttons** at top of pack: [Study These] [Quiz Me] [Practice Speaking] [Talk to Tutor]
- These buttons navigate to Classroom tab with pack pre-selected

### Step 3.6 — Visual indicator for clickable phrases
- Each phrase row has a subtle underline or "(i)" icon
- Hover/tap expands to show enrichment
- Tooltip: "Tap for word breakdown & more"

---

## Phase 4: Classroom — 4-mode study lab

### Step 4.1 — Build ClassroomTab.tsx
- Main view: select a pack → choose mode
- "Back to Classroom Home" button when in a mode
- Progress overview on home screen
- 4 mode buttons in a row

### Step 4.2 — Flashcards mode
- Import existing FlashcardTab logic
- Cards show translation → tap to reveal source
- Prev/Next navigation
- Swipeable on mobile
- Track: cards reviewed per session

### Step 4.3 — Quizzes mode
- Import existing QuizTab logic
- Quiz types: Multiple choice, Spelling/Reading, Use in a sentence, Grammar fill-in, Fix the mistake, Match the pair, Audio quiz
- User selects quiz type before starting
- Results screen: score, correct/incorrect breakdown

### Step 4.4 — Speech mode
- Import existing SpeechLabTab logic
- Shows phrase → listen → record → AI scores pronunciation
- Per-phrase practice
- Track: speech sessions completed

### Step 4.5 — Tutor mode (Gemini Live)
- Voice conversation with AI
- Mode selection: Lesson Mode, Pronunciation, Free Conversation (default: Lesson Mode)
- Lesson Mode follows pack-based curriculum
- AI speaks in source language, only switches to target for examples
- Screenshots pack so it knows what you're studying
- Never veers off into random conversation
- [NOTE: Requires Gemini Live API — different from current REST API. May need to be stubbed until API access is available]

### Step 4.6 — Progress tracking
- Store in `progressStore.ts`:
  - Completed lessons (unit IDs)
  - Cards reviewed (count)
  - Quiz scores (per pack, running average)
  - Speech sessions (count)
  - Total phrases learned
- Display on Classroom home screen

---

## Phase 5: Settings tab

### Step 5.1 — Build SettingsTab.tsx
- Default source language
- Default target language
- TTS voice preference (speed)
- Clear all data button
- About / version

### Step 5.2 — Progress display
- Pull from `progressStore.ts`
- Display: lessons completed, cards reviewed, quiz avg score, speech sessions, phrases learned
- Per-language breakdown if multiple languages used

---

## Phase 6: Polish & cleanup

### Step 6.1 — Remove deprecated files
- Delete: `src/components/QuizTab.tsx`
- Delete: `src/components/SpeechLabTab.tsx`
- Delete: `src/components/UrbanSlangHubTab.tsx`
- Delete: `src/components/StarterDeckModal.tsx`
- Delete: `src/components/SavePhraseModal.tsx`
- Optionally delete: `src/components/FlashcardTab.tsx` (if logic fully merged into Classroom)
- Optionally delete: `src/components/PhrasebookTab.tsx` (if content merged into Textbook)
- Optionally delete: `src/utils/translationQueue.ts` (if queue system removed)

### Step 6.2 — Update README.md
- Reflect new tab structure
- Update API documentation
- Document Classroom modes
- Document Textbook unit structure

---

## Future: Full Site Language Toggle (Phase 7)

**When to do:** After core restructure is stable

**What it involves:**
- Install `react-i18next`
- Create `locales/en.json`, `locales/es.json`, `locales/fr.json` etc.
- Each JSON file contains 200+ translated strings for all UI labels
- Replace ALL hardcoded text in components with `{t('key')}` calls
- Language selector in Settings tab
- Persist language preference in localStorage

**Why it's a big project (not technically hard, just tedious):**
```
// Before:
<span className="font-black">Quick Practice:</span>

// After:  
import { useTranslation } from 'react-i18next';
const { t } = useTranslation();
...
<span className="font-black">{t('quick_practice')}</span>
```
Every text string across 10+ component files needs this change. ~10 hours of work.

---

## Git Strategy

### Files that need to be pushed first (before restructuring):
- `README.md` (already created — documents current architecture)
- `server.ts` (latest fixes: language-aware prompts, cleaner batch-translate)
- `src/components/TranslatorTab.tsx` (latest fixes: sourceLang-aware practice, debounce, removed dead code)
- `src/components/CurriculumTab.tsx` (latest fixes: pack button disable logic)
- `.env.example` (create — shows required env vars without exposing the key)
- `PLAN.md` (this file)

### NOT to push:
- `.env` (contains API key — keep in .gitignore)

### After restructure is complete:
- Push all changed/renamed/deleted files as one commit: "Restructure: Textbook, Classroom, Translator, Settings"

---

## Key Design Rules

1. Explanatory text MUST be in source language, NOT hardcoded English
2. Word breakdown: `original` = target language word, `translation` = source language meaning
3. Phonetic MUST always be Latin transliteration
4. All API responses MUST be valid JSON (no markdown, no code fences)
5. Tutor MUST speak in source language, only switch to target for examples
6. Each tab remembers its own language selection
7. Quick Practice is NOT practice — it's phrase generation. Lives in Translator as inspiration.
8. Grammar lessons live in Textbook units, not Classroom
9. Classroom tests + reinforces what Textbook teaches
10. Progress tracking per pack (cards reviewed, quiz scores) lives in Classroom

---

## v2 Revisions & Additions (July 2026)

### What changed from the original plan

| Original Idea | Status |
|---|---|
| **Phase 2.1** — Strip enrichment from Translator (remove word breakdown, slang, grammar, alternatives tabs) | ❌ **REVERSED** — Translator got richer: added Alternatives tab, audio on everything, grammar glossary, better notes |
| **Phase 2.2** — Add Google Translate fallback | ❌ Deferred — Gemini is fast enough for now |
| **Phase 6.1** — Delete old components | ✅ Still planned — merge into Classroom/Textbook |
| **Phase 3.5** — Enrichment per phrase in packs | ✅ Still planned — use reusable PhraseBreakdown component |
| All other phases | ✅ Still valid — tabs, units, classroom modes, settings |

### New concepts added

**1. Reusable `<PhraseBreakdown>` component**
- Extract the 4-tab enrichment system (Words, Alternatives, Slang, Grammar) from TranslatorTab
- Shared across Translator, Textbook packs, Conversation Packs, Classroom
- Every phrase everywhere gets the same unified enrichment display
- Adds "Use in sentence" to word cards (shows parent sentence context)

**2. Conversation Packs**
- Mini-dialogues between 2 speakers on real-life topics
- Each line: target text → translation → key vocab → audio
- **In Translator**: shows contextually below translation (e.g., translate "coffee" → "Ordering Coffee" pack appears)
- **In Textbook**: dedicated section alongside Core Packs and Custom Packs
- **In Classroom**: roleplay mode — practice each side of dialogue
- Pre-write 10-15 core packs as JSON; AI generates more on demand

**3. Per-language Knowledge Base** (reduce AI dependency)
- `src/data/languages/el.ts`, `fr.ts`, etc.
- Contains: 500+ common words pre-translated, core grammar pattern templates, phonetic rules
- Client-side word breakdown lookup: if word is in KB, skip AI call entirely
- Grammar tips from templates instead of AI generation
- Biggest AI-reduction feature — ~1-2 weeks per language but covers 80% of everyday phrases

**4. Language-aware rendering config**
- `src/data/languageConfig.ts` — per-language rules (script type, cases, gender, word order, phonetic system)
- UI dynamically shows/hides relevant sections per language
- Greek → show case info; Japanese → show politeness levels; etc.

**5. Custom Packs reimagined**
- Instead of manual paste → translate, now "Generate 25 phrases about [topic]"
- AI batch-generates a full pack in one click
- Stored locally, appears in Textbook alongside core packs
- Same as Quick Practice but creates a permanent pack

**6. "Use in sentence" on word cards**
- Each word in word breakdown shows the full sentence it came from with the word highlighted
- Already technically possible (every word has a parent sentence) — just needs UI

### Revised file changes

#### New files to create
- `src/components/PhraseBreakdown.tsx` — reusable enrichment component (extracted from TranslatorTab)
- `src/components/ClassroomTab.tsx` — 4-mode classroom (Flashcards, Quizzes, Speech, Tutor + Conversation roleplay)
- `src/components/SettingsTab.tsx` — preferences + progress
- `src/components/ConversationPackView.tsx` — conversation pack renderer
- `src/data/languageConfig.ts` — per-language rendering rules
- `src/data/languages/el.ts` — Greek knowledge base (common words, grammar patterns)
- `src/data/conversationPacks.ts` — pre-written dialogue packs (10-15)
- `src/utils/progressStore.ts` — track completed lessons, quiz scores, flashcards done

#### Files to modify (revised)
- `src/App.tsx` — 4 tabs, integrate PhraseBreakdown, Conversation Packs
- `src/components/Header.tsx` — 4 tabs
- `src/components/CurriculumTab.tsx` → rename to `TextbookTab.tsx` + add pack types
- `src/components/TranslatorTab.tsx` — **KEEP enrichment** (reversed from original plan), add Conversation Packs section below translation
- `src/types.ts` — add `ConversationPack`, `LanguageKnowledgeBase` types

#### Files to remove (unchanged)
- `QuizTab.tsx`, `SpeechLabTab.tsx`, `UrbanSlangHubTab.tsx`, `StarterDeckModal.tsx`, `SavePhraseModal.tsx`
- `PhrasebookTab.tsx` (content merges into Textbook)
- `FlashcardTab.tsx` (logic merges into Classroom)

### Prioritized implementation roadmap

#### Phase A: Frontend Foundations
```
Step 1 — Reusable <PhraseBreakdown> component + "Use in sentence" on word cards
    • Extract 4-tab system from TranslatorTab into PhraseBreakdown.tsx
    • Add sentence context to each word card
    • Size: 1-2 days
    • Value: Eliminates duplicated enrichment code everywhere

Step 2 — Language-aware rendering config
    • Create languageConfig.ts with per-language rules
    • UI adapts sections per language
    • Size: 2 days
    • Value: Future-proofs UI for any language

Step 3 — Per-language knowledge base (Greek first)
    • 500+ common words pre-translated
    • Core grammar pattern templates (no AI needed for common patterns)
    • Client-side word lookup skips AI for known words
    • Size: 1-2 weeks
    • Value: Biggest AI cost reduction, instant word breakdowns
```

#### Phase B: Conversation Packs + Pack System
```
Step 4 — Conversation Packs data model
    • New data type + 10-15 pre-written packs as JSON
    • Display contextually in Translator below translation
    • Size: 2-3 days
    • Value: Immediate feature users can interact with

Step 5 — Unified Pack system in Textbook
    • One component for Core Packs, Conversation Packs, Custom Packs
    • Each phrase expandable → shows Phrase Breakdown
    • Auto-saved "Quick Translations" pack
    • Size: 1 week
    • Value: Consolidates all learning content in one place

Step 6 — Custom Packs (AI bulk generation)
    • "Generate 25 phrases about [topic]" button
    • AI batch-generates → stored locally as pack
    • Size: 2 days
    • Value: Users can create study material on any topic
```

#### Phase C: Classroom Restructure
```
Step 7 — Classroom tab
    • Merge flashcard, quiz, speech logic
    • Add Conversation Roleplay mode
    • Select a pack → choose study mode
    • Size: 2 weeks
```

#### Phase D: Settings + Polish
```
Step 8 — Settings tab + progress tracking
    • Preferences, defaults, progress stats
    • Size: 2 days

Step 9 — Remove old components, cleanup
    • Delete deprecated files, update README
    • Size: 1 day
```

#### Phase E: App-wide Intelligence
```
Step 10 — Template-based quiz generation
    • Generate fill-in-blank, MCQs from any phrase without AI
    • Size: 3 days

Step 11 — Offline phrase packs (IndexedDB)
    • Core packs downloadable once, usable offline
    • Size: 3 days
```

### Recommended starting point

**Phase A, Step 1** (PhraseBreakdown component + "Use in sentence") — sets up the architecture everything else depends on, with immediate visible improvement to word cards.
