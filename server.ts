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

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set.');
  return new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
}

const cache = new Map<string, any>();
const MAX_CACHE = 500;
function cacheGet(k: string) { return cache.get(k); }
function cacheSet(k: string, v: any) {
  if (cache.size >= MAX_CACHE) { const o = cache.keys().next().value; if (o) cache.delete(o); }
  cache.set(k, v);
}

async function callGemini(ai: any, params: { contents: any; config?: any }) {
  const models = ['gemini-3.1-flash-lite', 'gemini-3.6-flash', 'gemini-flash-latest'];
  let lastErr: any = null;
  for (const model of models) {
    try { return await ai.models.generateContent({ ...params, model }); }
    catch (e: any) { lastErr = e; }
  }
  throw lastErr;
}

// 1. SINGLE-PHRASE TRANSLATION
app.post('/api/translate', async (req, res) => {
  try {
    const { text, sourceLang = 'auto', targetLang = 'es' } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: 'Text required' });

    const ck = `trans:${sourceLang}:${targetLang}:${text.trim().toLowerCase()}`;
    const cached = cacheGet(ck);
    if (cached) return res.json({ ...cached, isCached: true });

    const ai = getGeminiClient();
    const response = await callGemini(ai, {
      contents: `Translate "${text.trim()}" from ${sourceLang} to ${targetLang}. Return JSON.`,
      config: {
        systemInstruction: `You are a language tutor. Return ONLY valid JSON with fields: translatedText, overallPhonetic, sentences (array of {sourceSentence, translatedSentence, phonetic, wordBreakdown: [{original, phonetic, translation, pos, note}]}), slangInsights ([{phrase, meaning, literalTranslation, culturalNote, register}]), grammarNotes (string[]), alternativeTranslations (array of {phrase: "alternative way to say it in ${targetLang}", phonetic: "Latin transliteration", literalMeaning: "literal meaning in ${sourceLang}"}), formalityLevel, sourceLang, targetLang, detectedSourceLang, sourceText. Include 2-4 alternative ways to say the same thing covering formal, neutral, and casual registers. Write all explanatory text (grammar notes, slang meanings, cultural notes, word breakdown notes) in ${sourceLang}. Phonetic must be Latin transliteration.`,
        responseMimeType: 'application/json',
      },
    });

    const data = JSON.parse(response.text || '{}');
    cacheSet(ck, data);
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: 'Translation failed', details: e.message });
  }
});

// 2. BATCH TRANSLATION
app.post('/api/batch-translate', async (req, res) => {
  try {
    const { phrases, targetLang = 'es' } = req.body;
    if (!Array.isArray(phrases) || !phrases.length) return res.status(400).json({ error: 'phrases required' });

    const ai = getGeminiClient();
    const ids = phrases.map((p: any) => `{"id":"${p.id}","english":"${p.english}","translated":"...","phonetic":"...","grammarNote":"..."}`).join(',');

    const response = await callGemini(ai, {
      contents: `Translate these ${phrases.length} English phrases into ${targetLang}. Return JSON: {"results":[${ids}]}. Fill all fields.`,
      config: {
        systemInstruction: `Translate exactly. Return ONLY valid JSON. Phonetic in Latin script. Grammar notes in plain English.`,
        responseMimeType: 'application/json',
      },
    });

    res.json(JSON.parse(response.text || '{"results":[]}'));
  } catch (e: any) { res.status(500).json({ error: 'Batch failed', details: e.message }); }
});

// 3. AI PRACTICE
app.post('/api/generate-practice', async (req, res) => {
  try {
    const { category, targetLang = 'es', sourceLang = 'en', usedPhrases = [] } = req.body;
    if (!category) return res.status(400).json({ error: 'category required' });

    const avoid = usedPhrases.length > 0 ? `Do NOT use: ${usedPhrases.slice(0, 10).join(', ')}.` : '';
    const ai = getGeminiClient();

    const response = await callGemini(ai, {
      contents: `Generate a NEW practical ${category} phrase for learning ${targetLang}. The user speaks ${sourceLang}. ${avoid} Return JSON: {"phraseInSourceLang":"the actual phrase in ${sourceLang}","phraseInTargetLang":"translation to ${targetLang}","targetPhonetic":"Latin transliteration of the ${targetLang} phrase","grammarNotes":["1-2 short tips written in ${sourceLang}"],"slangInsights":[{"phrase":"related slang in ${targetLang}","meaning":"explanation in ${sourceLang}","literalTranslation":"literal meaning","culturalNote":"written in ${sourceLang}","register":"casual"}]}`,
      config: {
        systemInstruction: `Generate fresh unique practice phrases. Never repeat. Return ONLY valid JSON. The "phraseInSourceLang" field must contain a real phrase in ${sourceLang}. The "phraseInTargetLang" must be the translation to ${targetLang}. All notes and explanations in ${sourceLang}.`,
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(Array.isArray(parsed) ? parsed[0] : parsed);
  } catch (e: any) { res.status(500).json({ error: 'Practice failed' }); }
});

// 4. FREE TTS PROXY
app.get('/api/free-tts', async (req, res) => {
  try {
    const { text, lang } = req.query;
    if (!text || !lang) return res.status(400).json({ error: 'text and lang required' });
    const cleanLang = String(lang).split('-')[0].toLowerCase();
    const sanitized = String(text).replace(/\n/g, ' ').trim().slice(0, 200);
    const ck = `tts:${cleanLang}:${sanitized}`;
    const cached = cacheGet(ck);
    if (cached) { res.set({ 'Content-Type': 'audio/mpeg', 'Content-Length': cached.length, 'Cache-Control': 'public, max-age=86400' }); return res.send(cached); }
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(sanitized)}&tl=${cleanLang}&client=tw-ob`;
    const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!resp.ok) return res.status(resp.status).json({ error: 'TTS fetch failed' });
    const buffer = Buffer.from(await resp.arrayBuffer());
    cacheSet(ck, buffer);
    res.set({ 'Content-Type': 'audio/mpeg', 'Content-Length': buffer.length, 'Cache-Control': 'public, max-age=86400' });
    res.send(buffer);
  } catch (e: any) { res.status(500).json({ error: 'TTS failed' }); }
});

// 5. TTS (no-op)
app.post('/api/tts', async (_req, res) => { res.json({ audioBase64: null, useFallback: true }); });

// 6. QUIZ
app.post('/api/generate-quiz', async (req, res) => {
  try {
    const { phrases = [], targetLang = 'es', topic = 'General' } = req.body;
    const ai = getGeminiClient();
    const r = await callGemini(ai, {
      contents: `Generate 5 quiz questions for ${targetLang}. Topic: ${topic}. Context: ${JSON.stringify(phrases)}`,
      config: { systemInstruction: 'Return JSON: {"questions":[{"id","type","question","promptText","options":[],"correctAnswerIndex":0,"explanation"}]}', responseMimeType: 'application/json' },
    });
    res.json(JSON.parse(r.text || '{"questions":[]}'));
  } catch (e: any) { res.status(500).json({ error: 'Quiz failed' }); }
});

// 7. PRONUNCIATION
app.post('/api/check-pronunciation', async (req, res) => {
  try {
    const { expectedText, transcript, targetLang = 'es' } = req.body;
    if (!expectedText || !transcript) return res.status(400).json({ error: 'expectedText and transcript required' });
    const ai = getGeminiClient();
    const r = await callGemini(ai, {
      contents: `Expected: "${expectedText}". Spoken: "${transcript}". Language: ${targetLang}. Score 0-100.`,
      config: { systemInstruction: 'Return JSON: {"score":85,"transcript":"...","feedbackText":"...","strengths":[],"improvements":[],"phoneticComparison":"..."}', responseMimeType: 'application/json' },
    });
    res.json(JSON.parse(r.text || '{}'));
  } catch (e: any) { res.status(500).json({ error: 'Pronunciation check failed' }); }
});

// 8. URBAN SLANG
app.post('/api/generate-urban-slang', async (req, res) => {
  try {
    const { targetLang = 'el', category = 'street slang' } = req.body;
    const ai = getGeminiClient();
    const r = await callGemini(ai, {
      contents: `Generate 6 ${category} phrases in ${targetLang}.`,
      config: { systemInstruction: 'Return JSON: {"slangList":[{"phrase","phonetic","meaning","literalTranslation","culturalNote","register"}]}', responseMimeType: 'application/json' },
    });
    res.json(JSON.parse(r.text || '{"slangList":[]}'));
  } catch (e: any) { res.status(500).json({ error: 'Slang failed' }); }
});

// 9. STARTER DECK
app.post('/api/generate-starter-deck', async (req, res) => {
  try {
    const { targetLang = 'el', langName = 'Greek' } = req.body;
    const ai = getGeminiClient();
    const r = await callGemini(ai, {
      contents: `Generate 32-phrase 4-level learning deck for ${langName} (${targetLang}).`,
      config: { systemInstruction: 'Return JSON: {"levels":[{"levelNumber":1,"levelTitle":"...","description":"...","items":[{"sourceText":"...","translatedText":"...","phonetic":"...","grammarNote":"...","tags":[]}]}]}. Grammar notes in English, phonetics Latin.', responseMimeType: 'application/json' },
    });
    res.json(JSON.parse(r.text || '{"levels":[]}'));
  } catch (e: any) { res.status(500).json({ error: 'Deck failed' }); }
});

async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const dist = path.join(process.cwd(), 'dist');
    app.use(express.static(dist));
    app.get('*', (_, res) => res.sendFile(path.join(dist, 'index.html')));
  }
  app.listen(PORT, '0.0.0.0', () => console.log(`Polyglotbot running on http://localhost:${PORT}`));
}
start();