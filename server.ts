import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Modality, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy init Gemini AI client
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set in environment variables.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Server-side in-memory cache for ultra-fast instant responses
const translationCache = new Map<string, any>();
const MAX_CACHE_SIZE = 500;

function getCachedTranslation(key: string) {
  return translationCache.get(key);
}

function setCachedTranslation(key: string, value: any) {
  if (translationCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = translationCache.keys().next().value;
    if (oldestKey) translationCache.delete(oldestKey);
  }
  translationCache.set(key, value);
}

// Helper to call Gemini with model fallback in case of rate limits or model availability
async function callGeminiWithFallback(ai: any, params: {
  contents: any;
  config?: any;
}) {
  // Try gemini-3.1-flash-lite first for lightning fast response time, then 3.6-flash
  const modelsToTry = ['gemini-3.1-flash-lite', 'gemini-3.6-flash', 'gemini-flash-latest'];
  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        ...params,
        model,
      });
      return response;
    } catch (err: any) {
      console.warn(`Gemini call with model ${model} failed: ${err?.message || err}. Trying next model...`);
      lastError = err;
    }
  }
  throw lastError;
}

// 1. REAL-TIME AI TRANSLATION & TUTOR ROUTE
app.post('/api/translate', async (req, res) => {
  try {
    const { text, sourceLang = 'auto', targetLang = 'es' } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Text is required for translation.' });
    }

    const cacheKey = `${sourceLang}:${targetLang}:${text.trim().toLowerCase()}`;
    const cached = getCachedTranslation(cacheKey);
    if (cached) {
      console.log(`[Cache Hit - 0ms] Returning cached translation for key: ${cacheKey}`);
      return res.json({ ...cached, isCached: true });
    }

    const ai = getGeminiClient();

    const systemInstruction = `You are Polyglotbot, a world-class AI language tutor and translation engine.
Translate the input text into the target language (${targetLang}) from source language (${sourceLang}).

CRITICAL INSTRUCTIONS:
1. ALL explanations ("grammarNotes", "wordBreakdown.note", "wordBreakdown.pos", "slangInsights.meaning", "slangInsights.culturalNote") MUST BE WRITTEN IN ENGLISH so learners can understand grammar rules!
2. "wordBreakdown[].original" MUST be the target language word/phrase in native script (e.g., "Γεια σου").
3. "wordBreakdown[].translation" MUST be the English translation (e.g., "Hello to you").
4. "wordBreakdown[].phonetic" MUST be a clear Latin phonetic transliteration (e.g., "Yia soo").

Return ONLY valid JSON matching this exact structure:
{
  "sourceLang": "${sourceLang}",
  "targetLang": "${targetLang}",
  "detectedSourceLang": "e.g. en or el",
  "sourceText": "original text",
  "translatedText": "translated text in target language",
  "overallPhonetic": "Phonetic pronunciation guide or transliteration (e.g., Pinyin, Romaji, Greek Transliteration, Arabic Transliteration)",
  "formalityLevel": "formal" | "neutral" | "casual",
  "alternativeTranslations": ["alt 1", "alt 2"],
  "grammarNotes": ["concise English grammar rule tip 1", "concise English grammar rule tip 2"],
  "sentences": [
    {
      "sourceSentence": "first sentence in source language",
      "translatedSentence": "translated sentence in target language",
      "phonetic": "sentence phonetic guide",
      "wordBreakdown": [
        {
          "original": "target language word in native script",
          "phonetic": "word phonetic transliteration",
          "translation": "English meaning",
          "pos": "Noun | Verb | Particle | Idiom | Expression",
          "note": "English grammar/usage rule note"
        }
      ]
    }
  ],
  "slangInsights": [
    {
      "phrase": "native colloquial or urban phrase in target language",
      "meaning": "English meaning",
      "literalTranslation": "literal English translation",
      "culturalNote": "English cultural context note",
      "register": "casual" | "urban/slang" | "idiomatic" | "polite"
    }
  ]
}`;

    const prompt = `Translate and analyze this text for a learner:
Source Language: ${sourceLang}
Target Language: ${targetLang}
Input Text:
"""
${text.trim()}
"""`;

    let response;
    try {
      response = await callGeminiWithFallback(ai, {
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              sourceLang: { type: Type.STRING },
              targetLang: { type: Type.STRING },
              detectedSourceLang: { type: Type.STRING },
              sourceText: { type: Type.STRING },
              translatedText: { type: Type.STRING },
              overallPhonetic: { type: Type.STRING },
              formalityLevel: { type: Type.STRING },
              alternativeTranslations: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              grammarNotes: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              sentences: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    sourceSentence: { type: Type.STRING },
                    translatedSentence: { type: Type.STRING },
                    phonetic: { type: Type.STRING },
                    wordBreakdown: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          original: { type: Type.STRING },
                          phonetic: { type: Type.STRING },
                          translation: { type: Type.STRING },
                          pos: { type: Type.STRING },
                          note: { type: Type.STRING },
                        },
                        required: ['original', 'translation', 'pos'],
                      },
                    },
                  },
                  required: ['sourceSentence', 'translatedSentence', 'wordBreakdown'],
                },
              },
              slangInsights: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    phrase: { type: Type.STRING },
                    meaning: { type: Type.STRING },
                    literalTranslation: { type: Type.STRING },
                    culturalNote: { type: Type.STRING },
                    register: { type: Type.STRING },
                  },
                  required: ['phrase', 'meaning', 'culturalNote'],
                },
              },
            },
            required: [
              'translatedText',
              'overallPhonetic',
              'sentences',
              'slangInsights',
              'grammarNotes',
            ],
          },
        },
      });

      const resultText = response.text || '{}';
      const translationData = JSON.parse(resultText);
      setCachedTranslation(cacheKey, translationData);
      return res.json(translationData);
    } catch (genErr: any) {
      console.error('All Gemini models failed for translate, providing rate-limit aware response:', genErr);
      const isQuotaError = String(genErr?.message || genErr).includes('429') || String(genErr?.message || genErr).includes('quota');
      return res.status(429).json({
        error: isQuotaError ? 'Gemini API free tier rate limit temporarily reached. Please retry in a few seconds.' : 'Translation service temporarily busy. Please try again.',
        details: genErr?.message || String(genErr),
      });
    }
  } catch (error: any) {
    console.error('Translation error:', error);
    return res.status(500).json({
      error: 'Failed to process translation.',
      details: error.message || String(error),
    });
  }
});

// 2. FREE TTS PROXY — fetches MP3 from Google Translate, serves same-origin, cached in memory
app.get('/api/free-tts', async (req, res) => {
  try {
    const { text, lang } = req.query;
    if (!text || !lang) {
      return res.status(400).json({ error: 'text and lang query params required' });
    }

    const cleanLang = String(lang).split('-')[0].toLowerCase();
    const sanitized = String(text).replace(/\n/g, ' ').trim().slice(0, 200);

    // Check in-memory cache (same map used by translations)
    const cacheKey = `tts:${cleanLang}:${sanitized}`;
    const cached = getCachedTranslation(cacheKey);
    if (cached) {
      console.log(`[TTS Cache Hit] Returning cached audio for "${sanitized}"`);
      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': cached.length,
        'Cache-Control': 'public, max-age=86400',
      });
      return res.send(cached);
    }

    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(sanitized)}&tl=${cleanLang}&client=tw-ob`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch TTS audio' });
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    // Cache for future requests (hit 0ms on repeated same-phrase clicks)
    setCachedTranslation(cacheKey, buffer);

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': buffer.length,
      'Cache-Control': 'public, max-age=86400',
    });
    res.send(buffer);
  } catch (err: any) {
    console.error('Free TTS proxy error:', err);
    res.status(500).json({ error: 'TTS proxy failed' });
  }
});

// 2.5. GEMINI TTS — premium quality (original endpoint)
// 2. TEXT-TO-SPEECH ENDPOINT
app.post('/api/tts', async (req, res) => {
  try {
    const { text, voice = 'Zephyr' } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required for audio generation.' });
    }

    const ai = getGeminiClient();
    const ttsResponse = await ai.models.generateContent({
      model: 'gemini-3.1-flash-tts-preview',
      contents: [{ parts: [{ text: `Speak clearly: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });

    const audioData = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audioData) {
      return res.json({ audioBase64: null, useFallback: true });
    }

    return res.json({ audioBase64: audioData });
  } catch (error: any) {
    console.info('TTS endpoint info: Rate limit or preview unavailable, signaling WebSpeech fallback.');
    return res.json({ audioBase64: null, useFallback: true });
  }
});

// 3. AI QUIZ GENERATOR ENDPOINT
app.post('/api/generate-quiz', async (req, res) => {
  try {
    const { phrases = [], targetLang = 'es', topic = 'General' } = req.body;
    const cacheKey = `quiz:${targetLang}:${topic.toLowerCase()}:${phrases.length}`;
    const cachedQuiz = getCachedTranslation(cacheKey);
    if (cachedQuiz) {
      console.log(`[Server Cache Hit] Quiz for ${cacheKey}`);
      return res.json(cachedQuiz);
    }

    const ai = getGeminiClient();

    const systemInstruction = `You are Polyglotbot Quiz Creator.
Generate 5 interactive, fun, and high-yield quiz questions for learning language ${targetLang}.
If saved phrases are provided, generate questions directly testing those saved phrases (e.g. translation, meaning, fill-in-the-blank).
Otherwise generate top essential vocabulary/phrases questions for the topic: ${topic}.

Return strictly JSON format:
{
  "questions": [
    {
      "id": "q1",
      "type": "mcq_translation" | "mcq_meaning" | "fill_blank" | "audio_listen",
      "question": "Clear prompt question",
      "promptText": "Text in target or source language to translate or fill in",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswerIndex": 0,
      "explanation": "Grammar and vocabulary breakdown explaining why this answer is correct."
    }
  ]
}`;

    const prompt = `Phrases context: ${JSON.stringify(phrases)}
Target Language: ${targetLang}
Topic: ${topic}`;

    const response = await callGeminiWithFallback(ai, {
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    const quizData = JSON.parse(response.text || '{"questions":[]}');
    setCachedTranslation(cacheKey, quizData);
    return res.json(quizData);
  } catch (error: any) {
    console.error('Quiz generation error:', error);
    return res.status(500).json({ error: 'Failed to generate quiz.' });
  }
});

// 4. PRONUNCIATION GRADER & TUTOR FEEDBACK
app.post('/api/check-pronunciation', async (req, res) => {
  try {
    const { expectedText, transcript, targetLang = 'es' } = req.body;
    if (!expectedText || !transcript) {
      return res.status(400).json({ error: 'expectedText and transcript are required.' });
    }

    const cacheKey = `pron:${targetLang}:${expectedText.trim().toLowerCase()}:${transcript.trim().toLowerCase()}`;
    const cachedPron = getCachedTranslation(cacheKey);
    if (cachedPron) {
      console.log(`[Server Cache Hit] Pronunciation for ${cacheKey}`);
      return res.json(cachedPron);
    }

    const ai = getGeminiClient();
    const systemInstruction = `You are Polyglotbot Pronunciation Coach.
Compare the user's spoken transcript against the expected target text in ${targetLang}.
Return JSON format:
{
  "score": 85, // 0 to 100
  "transcript": "spoken user text",
  "feedbackText": "Constructive 2-sentence encouraging review",
  "strengths": ["Clear vowel sounds", "Good cadence"],
  "improvements": ["Soften the 'r' rolling slightly", "Watch stress on second syllable"],
  "phoneticComparison": "Expected: [phonetics] vs Heard: [phonetics]"
}`;

    const prompt = `Expected: "${expectedText}"
User Spoken Transcript: "${transcript}"
Target Language: ${targetLang}`;

    const response = await callGeminiWithFallback(ai, {
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    const feedback = JSON.parse(response.text || '{}');
    setCachedTranslation(cacheKey, feedback);
    return res.json(feedback);
  } catch (error: any) {
    console.error('Pronunciation check error:', error);
    return res.status(500).json({ error: 'Failed to check pronunciation.' });
  }
});

// 5. URBAN SLANG & CULTURAL PHRASES DISCOVERY
app.post('/api/generate-urban-slang', async (req, res) => {
  try {
    const { targetLang = 'el', category = 'street slang' } = req.body;
    const cacheKey = `slang:${targetLang}:${category.trim().toLowerCase()}`;
    const cachedSlang = getCachedTranslation(cacheKey);
    if (cachedSlang) {
      console.log(`[Server Cache Hit] Urban Slang for ${cacheKey}`);
      return res.json(cachedSlang);
    }

    const ai = getGeminiClient();

    const systemInstruction = `You are Polyglotbot Urban Culture & Slang Expert.
Generate 6 authentic native street slang phrases, idioms, and colloquialisms used by young natives in ${targetLang}.
Return JSON format:
{
  "slangList": [
    {
      "phrase": "Native slang phrase",
      "phonetic": "phonetic guide",
      "meaning": "natural English meaning",
      "literalTranslation": "word-for-word translation",
      "culturalNote": "context, nuance, when to use or avoid",
      "register": "urban/slang"
    }
  ]
}`;

    const response = await callGeminiWithFallback(ai, {
      contents: `Generate native slang for language code ${targetLang} under category ${category}`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    const data = JSON.parse(response.text || '{"slangList":[]}');
    setCachedTranslation(cacheKey, data);
    return res.json(data);
  } catch (error: any) {
    console.error('Slang generation error:', error);
    return res.status(500).json({ error: 'Failed to generate slang expressions.' });
  }
});

// 5. STARTER 100-CARD LEVEL DECK GENERATOR
app.post('/api/generate-starter-deck', async (req, res) => {
  try {
    const { targetLang = 'el', langName = 'Greek' } = req.body;

    const cacheKey = `starter_deck:${targetLang}`;
    const cachedDeck = getCachedTranslation(cacheKey);
    if (cachedDeck) {
      console.log(`[Cache Hit] Starter deck for ${targetLang}`);
      return res.json(cachedDeck);
    }

    const ai = getGeminiClient();

    const systemInstruction = `You are Polyglotbot Master Language Curriculum Creator.
Generate a high-yield learning deck of 32 essential expressions for ${langName} (${targetLang}) structured into 4 mastery levels (8 items per level):
- Level 1: Core Greetings & Essentials
- Level 2: Travel, Dining & Directions
- Level 3: Everyday Conversations & Grammar Patterns
- Level 4: Native Slang, Culture & Idioms

Return JSON structure:
{
  "levels": [
    {
      "levelNumber": 1,
      "levelTitle": "Level 1: Core Greetings & Essentials",
      "description": "Fundamental hellos, thank yous, and polite survival words",
      "items": [
        {
          "sourceText": "Hello / Hi",
          "translatedText": "native target script",
          "phonetic": "English phonetic transliteration",
          "grammarNote": "English explanation of grammar rule or usage context",
          "tags": ["Level 1", "Greetings"]
        }
      ]
    },
    {
      "levelNumber": 2,
      "levelTitle": "Level 2: Travel, Dining & Directions",
      "description": "Essential travel phrases for food, places, and navigating",
      "items": [...]
    },
    {
      "levelNumber": 3,
      "levelTitle": "Level 3: Everyday Conversations & Grammar",
      "description": "Connecting phrases and key grammatical sentence structures",
      "items": [...]
    },
    {
      "levelNumber": 4,
      "levelTitle": "Level 4: Native Slang & Idiom Mastery",
      "description": "Authentic local slang and street expressions used by young natives",
      "items": [...]
    }
  ]
}
IMPORTANT:
- "translatedText" MUST be in the native target language script.
- "sourceText" MUST be in clear English.
- "grammarNote" MUST be in English explaining the grammar or context.
- "phonetic" MUST be easy Latin transliteration for English speakers.`;

    const response = await callGeminiWithFallback(ai, {
      contents: `Generate master 32-phrase 4-level learning path deck for language ${langName} (${targetLang})`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    const deckData = JSON.parse(response.text || '{"levels":[]}');
    setCachedTranslation(cacheKey, deckData);
    return res.json(deckData);
  } catch (error: any) {
    console.error('Starter deck generation error:', error);
    return res.status(500).json({ error: 'Failed to generate starter deck.' });
  }
});

// VITE MIDDLEWARE & STATIC SERVER
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Polyglotbot server running on http://localhost:${PORT}`);
  });
}

startServer();
