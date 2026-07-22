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
  if (cache.size >= MAX_CACHE) { const oldest = cache.keys().next().value; if (oldest) cache.delete(oldest); }
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
      contents: `Translate: "${text.trim()}" from ${sourceLang} to ${targetLang}. Return JSON with: translatedText, overallPhonetic, sentences (array of {sourceSentence,translatedSentence,phonetic,wordBreakdown:[{original,phonetic,translation,pos,note}]}), slangInsights ([{phrase,meaning,literalTranslation,culturalNote,register}]), grammarNotes (string[]), alternativeTranslations (string[]), formalityLevel, sourceLang, targetLang, detectedSourceLang, sourceText. All explanations MUST be in English.`,
      config: {
        systemInstruction: `You are a language tutor. Return ONLY valid JSON. Phonetic must be clear Latin transliteration. Word breakdown notes must be in English.`,
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

// 2. BATCH TRANSLATION — 25 phrases in one call (~3 seconds instead of 2 minutes)
app.post('/api/batch-translate', async (req, res) => {
  try {
    const { phrases, targetLang = 'es' } = req.body;
    if (!Array.isArray(phrases) || phrases.length === 0) return res.status(400).json({ error: 'phrases array required' });

    const ai = getGeminiClient();
    const phraseList = phrases.map((p: any) => `"${p.english}"`).join('\n');

    const response = await callGemini(ai, {
      contents: `Translate EXACTLY these ${phrases.length} English phrases into ${targetLang}. Do NOT change, rephrase, or substitute any phrases. Return a JSON object: {"results": [${phrases.map((p: any) => `{"id":"${p.id}","english":"${p.english}","translated":"...","phonetic":"...","grammarNote":"..."}`).join(',')}]}. Fill in translated, phonetic, and grammarNote for EACH phrase. ALL grammar notes in plain English. Phonetic MUST be clear Latin transliteration.`,
      config: {
        systemInstruction: `You are a precise language translator. Translate each phrase exactly as given — do NOT modify, expand, or change the English text. Return ONLY valid JSON with the exact same id and english fields.`,
        responseMimeType: 'application/json',
      },
    });

    const data = JSON.parse(response.text || '{"results":[]}');
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: 'Batch translation failed', details: e.message });
  }
});

// 3. AI-GENERATED PRACTICE PHRASES — fresh unique phrases per category, never repeats
app.post('/api/generate-practice', async (req, res) => {
  try {
    const { category, targetLang = 'es', usedPhrases = [] } = req.body;
    if (!category) return res.status(400).json({ error: 'category required' });

    const ai = getGeminiClient();
    const previouslyUsed = usedPhrases.length > 0
      ? `Do NOT use any of these phrases: ${usedPhrases.slice(0, 10).join(', ')}.`
      : '';

    const response = await callGemini(ai, {
      contents: `Generate a NEW, practical ${category} phrase a traveler would use in a ${targetLang}-speaking country. ${previouslyUsed} Return ONE phrase that is natural and useful. Return JSON: {english: "the English phrase", translated: "translation in ${targetLang}", phonetic: "Latin transliteration", grammarNotes: ["1-2 short English grammar tips"], slangInsights: [{phrase,meaning,literalTranslation,culturalNote,register:"casual"}]}`,
      config: { systemInstruction: `Generate fresh, useful language practice phrases. Never repeat. Return ONLY valid JSON.`, responseMimeType: 'application/json' },
    });

    const data = JSON.parse(response.text || '{}');
    res.json(data);
  } catch (e: any) { res.status(500).json({ error: 'Practice generation failed' }); }
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
    if (cached) {
      res.set({ 'Content-Type': 'audio/mpeg', 'Content-Length': cached.length, 'Cache-Control': 'public, max-age=86400' });
      return res.send(cached);
    }
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(sanitized)}&tl=${cleanLang}&client=tw-ob`;
    const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!resp.ok) return res.status(resp.status).json({ error: 'TTS fetch failed' });
    const buffer = Buffer.from(await resp.arrayBuffer());
    cacheSet(ck, buffer);
    res.set({ 'Content-Type': 'audio/mpeg', 'Content-Length': buffer.length, 'Cache-Control': 'public, max-age=86400' });
    res.send(buffer);
  } catch (e: any) { res.status(500).json({ error: 'TTS failed' }); }
});

// 4. GEMINI TTS (premium)
app.post('/api/tts', async (req, res) => {
  try {
    const { text, voice = 'Zephyr' } = req.body;
    if (!text) return res.status(400).json({ error: 'Text required' });
    const ai = getGeminiClient();
    const r = await ai.models.generateContent({
      model: 'gemini-3.1-flash-tts-preview',
      contents: [{ parts: [{ text: `Speak: ${text}` }] }],
      config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } },
    });
    const audio = r.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    res.json({ audioBase64: audio || null, useFallback: !audio });
  } catch { res.json({ audioBase64: null, useFallback: true }); }
});

// 5. QUIZ GENERATOR
app.post('/api/generate-quiz', async (req, res) => {
  try {
    const { phrases = [], targetLang = 'es', topic = 'General' } = req.body;
    const ck = `quiz:${targetLang}:${topic}:${phrases.length}`;
    const cached = cacheGet(ck);
    if (cached) return res.json(cached);
    const ai = getGeminiClient();
    const r = await callGemini(ai, {
      contents: `Generate 5 quiz questions for ${targetLang}. Topic: ${topic}. Context: ${JSON.stringify(phrases)}`,
      config: { systemInstruction: `Return JSON: {questions:[{id,type:"mcq",question,promptText,options:[],correctAnswerIndex:0,explanation}]}`, responseMimeType: 'application/json' },
    });
    const data = JSON.parse(r.text || '{"questions":[]}');
    cacheSet(ck, data);
    res.json(data);
  } catch (e: any) { res.status(500).json({ error: 'Quiz failed' }); }
});

// 6. PRONUNCIATION CHECK
app.post('/api/check-pronunciation', async (req, res) => {
  try {
    const { expectedText, transcript, targetLang = 'es' } = req.body;
    if (!expectedText || !transcript) return res.status(400).json({ error: 'expectedText and transcript required' });
    const ai = getGeminiClient();
    const r = await callGemini(ai, {
      contents: `Expected: "${expectedText}". Spoken: "${transcript}". Language: ${targetLang}. Score pronunciation 0-100. Return JSON: {score,transcript,feedbackText,strengths:[],improvements:[],phoneticComparison}`,
      config: { systemInstruction: 'Return JSON pronunciation feedback.', responseMimeType: 'application/json' },
    });
    res.json(JSON.parse(r.text || '{}'));
  } catch (e: any) { res.status(500).json({ error: 'Pronunciation check failed' }); }
});

// 7. URBAN SLANG
app.post('/api/generate-urban-slang', async (req, res) => {
  try {
    const { targetLang = 'el', category = 'street slang' } = req.body;
    const ck = `slang:${targetLang}:${category}`;
    const cached = cacheGet(ck);
    if (cached) return res.json(cached);
    const ai = getGeminiClient();
    const r = await callGemini(ai, {
      contents: `Generate 6 ${category} phrases in ${targetLang}. Return JSON: {slangList:[{phrase,phonetic,meaning,literalTranslation,culturalNote,register}]}`,
      config: { systemInstruction: 'Return JSON.', responseMimeType: 'application/json' },
    });
    const data = JSON.parse(r.text || '{"slangList":[]}');
    cacheSet(ck, data);
    res.json(data);
  } catch (e: any) { res.status(500).json({ error: 'Slang failed' }); }
});

// 8. STARTER DECK
app.post('/api/generate-starter-deck', async (req, res) => {
  try {
    const { targetLang = 'el', langName = 'Greek' } = req.body;
    const ck = `deck:${targetLang}`;
    const cached = cacheGet(ck);
    if (cached) return res.json(cached);
    const ai = getGeminiClient();
    const r = await callGemini(ai, {
      contents: `Generate 32-phrase 4-level learning deck for ${langName} (${targetLang}). Return JSON: {levels:[{levelNumber,levelTitle,description,items:[{sourceText,translatedText,phonetic,grammarNote,tags}]}]}. Grammar notes in English, phonetics in Latin.`,
      config: { systemInstruction: 'Return JSON.', responseMimeType: 'application/json' },
    });
    const data = JSON.parse(r.text || '{"levels":[]}');
    cacheSet(ck, data);
    res.json(data);
  } catch (e: any) { res.status(500).json({ error: 'Deck generation failed' }); }
});

// VITE + STATIC
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