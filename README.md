# Polyglotbot — AI Language Tutor

A full-featured language learning app with AI-powered translation, text analysis, flashcards, quizzes, and speech practice. Supports 12 languages.

## Architecture Overview

```
┌────────────────────────────────┐
│  React SPA (Vite)              │  ← src/components/*
│  ├─ TranslatorTab (translate)  │
│  ├─ CurriculumTab (textbook)   │
│  ├─ PhrasebookTab (saved)      │
│  ├─ FlashcardTab (study)       │
│  ├─ QuizTab (AI quizzes)       │
│  ├─ SpeechLabTab (pronounce)   │
│  └─ UrbanSlangHubTab (slang)   │
└──────────────┬─────────────────┘
               │ POST /api/*
               ▼
┌────────────────────────────────┐
│  Express Server (server.ts)    │  ← local:3000
│  └─ Proxies to Gemini API      │
└──────────────┬─────────────────┘
               │ fetch()
               ▼
┌────────────────────────────────┐
│  Google Gemini (REST API)      │  ← free tier (rate-limited)
└────────────────────────────────┘

Alternative: Netlify Function (netlify/functions/api.js)
              Same 9 endpoints, same Gemini REST API
```

## Language Handling Rules

**IMPORTANT — These rules MUST be followed in all API calls:**

| Endpoint | Source Language | Explanations Language | Cache Key |
|---|---|---|---|
| `POST /api/translate` | User-selected `sourceLang` from dropdown | `${sourceLang}` | `trans:${sourceLang}:${targetLang}:${text.toLowerCase()}` |
| `POST /api/batch-translate` | Always English (core phrases) | English | N/A (cache on client via localStorage) |
| `POST /api/generate-practice` | User-selected `sourceLang` from dropdown | `${sourceLang}` | N/A (in-memory pool) |
| `POST /api/generate-quiz` | N/A | English | `quiz:${targetLang}:${topic}:${count}` |
| `POST /api/check-pronunciation` | N/A | English | N/A |
| `POST /api/generate-urban-slang` | N/A | English | `slang:${targetLang}:${category}` |
| `POST /api/generate-starter-deck` | N/A | English | N/A |

**Key rules:**
1. Explanatory text (grammar notes, slang meanings, word breakdown notes) MUST be in `${sourceLang}`, NOT hardcoded English
2. The `original` field in wordBreakdown MUST be the target language word in native script
3. The `translation` field in wordBreakdown MUST be the meaning in the source language
4. Phonetic MUST always be Latin transliteration
5. Response MUST always return valid JSON — no markdown, no code fences

## API Endpoints (9 total)

### 1. POST /api/translate — Single phrase translation
- **Body:** `{ text, sourceLang, targetLang }`
- **Response:** `{ translatedText, overallPhonetic, sentences[], slangInsights[], grammarNotes[], alternativeTranslations[], formalityLevel }`
- **Feature:** Full word breakdown with POS tags, slang detection, grammar analysis

### 2. POST /api/batch-translate — Bulk translate (textbook packs)
- **Body:** `{ phrases: [{id, english}], targetLang }`
- **Response:** `{ results: [{id, english, translated, phonetic, grammarNote}] }`
- **Feature:** Translates 25 phrases in ~3 seconds via single API call

### 3. POST /api/generate-practice — AI Quick Practice
- **Body:** `{ category, sourceLang, targetLang, usedPhrases[] }`
- **Response:** `{ phraseInSourceLang, phraseInTargetLang, targetPhonetic, grammarNotes[], slangInsights[] }`
- **Feature:** Never repeats phrases (tracks used in localStorage), falls back to cached pool on rate limit

### 4. GET /api/free-tts — Text-to-speech audio
- **Query:** `?text=...&lang=es`
- **Response:** `audio/mpeg` binary
- **Feature:** Proxies Google Translate TTS, cached for 24h

### 5. POST /api/tts — Premium TTS (Gemini)
- **Body:** `{ text, voice }`
- **Response:** `{ audioBase64, useFallback }`
- **Note:** Returns `useFallback: true` since DeepSeek doesn't support TTS

### 6. POST /api/generate-quiz — AI quiz generator
- **Body:** `{ phrases[], targetLang, topic }`
- **Response:** `{ questions: [{id, type, question, options, correctAnswerIndex, explanation}] }`

### 7. POST /api/check-pronunciation — Speech scoring
- **Body:** `{ expectedText, transcript, targetLang }`
- **Response:** `{ score, transcript, feedbackText, strengths[], improvements[], phoneticComparison }`

### 8. POST /api/generate-urban-slang — Slang generator
- **Body:** `{ targetLang, category }`
- **Response:** `{ slangList: [{phrase, phonetic, meaning, literalTranslation, culturalNote, register}] }`

### 9. POST /api/generate-starter-deck — Starter level packs
- **Body:** `{ targetLang, langName }`
- **Response:** `{ levels: [{levelNumber, title, description, items[]}] }`

## Data Flow

### Textbook Pack Unlock
1. User clicks "Unlock Pack N" on CurriculumTab
2. Frontend checks `localStorage` for `polyglot_core_${lang}` cache
3. Uncached phrases sent to `POST /api/batch-translate`
4. Results cached in `localStorage`
5. `onUnlockPack` creates folder + phrases in App state
6. App state persists to `localStorage`

### Quick Practice
1. User clicks category button
2. Frontend sends `POST /api/generate-practice` with `sourceLang`, `targetLang`, `usedPhrases`
3. Response populates translator input and output
4. Phrase added to used list in `localStorage` (avoids repeats)
5. On rate limit (429): falls back to in-memory pool of previously generated phrases
6. 2-second cooldown between clicks

### Single Translation
1. User types text (or Quick Practice populates input)
2. 800ms debounce triggers `POST /api/translate`
3. Cache check in both localStorage and in-memory
4. Response renders translated text + breakdown tabs
5. User can save to Phrasebook, play audio, copy

## Tech Stack

- **Frontend:** React (Vite), TypeScript, Tailwind CSS, Lucide icons
- **Backend:** Express.js (TypeScript), serves both API and static files
- **AI:** Google Gemini API (REST) via `generativelanguage.googleapis.com`
- **Deployment:** Netlify (static + serverless function) or Render (full server)
- **Persistence:** localStorage (phrases, folders, cache, preferences)
- **Audio:** Google Translate TTS proxy (free, no API key needed)

## Key Files

| File | Purpose |
|---|---|
| `server.ts` | Express server with all 9 API endpoints |
| `netlify/functions/api.js` | Netlify serverless function (same endpoints) |
| `src/App.tsx` | Root component — state management, persistence |
| `src/components/TranslatorTab.tsx` | Main translator + quick practice |
| `src/components/CurriculumTab.tsx` | Textbook with 40 phrase packs |
| `src/components/Header.tsx` | Navigation tabs |
| `src/data/corePhrases.ts` | 1000 English phrases (40 packs × 25) |
| `src/utils/translationQueue.ts` | Core phrase cache helpers |
| `src/utils/cacheStore.ts` | General-purpose cache with localStorage |
| `src/utils/audio.ts` | TTS playback utilities |

## Development

```bash
# Install
npm install

# Set up API key
echo "GEMINI_API_KEY=your_key_here" > .env

# Run
npm run dev  # → localhost:3000
```

## Deployment

### Netlify (current)
1. Connect GitHub repo to Netlify
2. Set `GEMINI_API_KEY` in environment variables
3. Netlify auto-detects `netlify.toml` configuration
4. Static files served from `dist/`, API from `netlify/functions/api.js`

### Render (alternative)
1. Set build command: `npm run build`
2. Set start command: `node dist/server.cjs`
3. Add `GEMINI_API_KEY` as environment variable