const express = require('express');
const serverless = require('serverless-http');
const { GoogleGenAI, Modality } = require('@google/genai');

const app = express();
app.use(express.json({ limit: '10mb' }));

// Gemini client
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');
  return new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'polyglotbot-netlify' } } });
}

// In-memory cache
const cache = new Map();
const MAX_CACHE = 500;
const cacheGet = (k) => cache.get(k);
const cacheSet = (k, v) => {
  if (cache.size >= MAX_CACHE) { const oldest = cache.keys().next().value; if (oldest) cache.delete(oldest); }
  cache.set(k, v);
};

async function callGemini(ai, params) {
  const models = ['gemini-3.1-flash-lite', 'gemini-3.6-flash', 'gemini-flash-latest'];
  let lastErr = null;
  for (const model of models) {
    try { return await ai.models.generateContent({ ...params, model }); }
    catch (e) { lastErr = e; }
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
      contents: `Translate: "${text.trim()}" from ${sourceLang} to ${targetLang}. Return JSON with: translatedText, overallPhonetic, sentences (array of {sourceSentence,translatedSentence,phonetic,wordBreakdown:[{original,phonetic,translation,pos,note}]}), slangInsights ([{phrase,meaning,literalTranslation,culturalNote,register}]), grammarNotes (string[]), alternativeTranslations (string[]), formalityLevel, sourceLang, targetLang, detectedSourceLang, sourceText. All explanations in English.`,
      config: { systemInstruction: 'You are a language tutor. Return ONLY valid JSON.', responseMimeType: 'application/json' },
    });
    const data = JSON.parse(response.text || '{}');
    cacheSet(ck, data);
    res.json(data);
  } catch (e) { res.status(500).json({ error: 'Translation failed', details: e.message }); }
});

// 2. BATCH TRANSLATION
app.post('/api/batch-translate', async (req, res) => {
  try {
    const { phrases, targetLang = 'es' } = req.body;
    if (!Array.isArray(phrases) || phrases.length === 0) return res.status(400).json({ error: 'phrases required' });
    const ai = getGeminiClient();
    const response = await callGemini(ai, {
      contents: `Translate EXACTLY these ${phrases.length} English phrases into ${targetLang}. Return JSON: {"results": [${phrases.map(p => `{"id":"${p.id}","english":"${p.english}","translated":"...","phonetic":"...","grammarNote":"..."}`).join(',')}]}. All notes in plain English.`,
      config: { systemInstruction: 'Return ONLY valid JSON. Translate exactly as given.', responseMimeType: 'application/json' },
    });
    res.json(JSON.parse(response.text || '{"results":[]}'));
  } catch (e) { res.status(500).json({ error: 'Batch failed' }); }
});

// 3. AI PRACTICE PHRASES
app.post('/api/generate-practice', async (req, res) => {
  try {
    const { category, targetLang = 'es', usedPhrases = [] } = req.body;
    if (!category) return res.status(400).json({ error: 'category required' });
    const ai = getGeminiClient();
    const avoid = usedPhrases.length > 0 ? `Do NOT use: ${usedPhrases.slice(0, 10).join(', ')}.` : '';
    const response = await callGemini(ai, {
      contents: `Generate a NEW ${category} phrase for ${targetLang}. ${avoid} Return JSON: {english, translated, phonetic, grammarNotes:[], slangInsights:[]}`,
      config: { systemInstruction: 'Generate fresh unique practice phrases. Return ONLY JSON.', responseMimeType: 'application/json' },
    });
    res.json(JSON.parse(response.text || '{}'));
  } catch (e) { res.status(500).json({ error: 'Practice failed' }); }
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
  } catch (e) { res.status(500).json({ error: 'TTS failed' }); }
});

// 5. GEMINI TTS
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

// 6. QUIZ GENERATOR
app.post('/api/generate-quiz', async (req, res) => {
  try {
    const { phrases = [], targetLang = 'es', topic = 'General' } = req.body;
    const ai = getGeminiClient();
    const r = await callGemini(ai, {
      contents: `Generate 5 quiz questions for ${targetLang}. Topic: ${topic}. Context: ${JSON.stringify(phrases)}`,
      config: { systemInstruction: 'Return JSON: {questions:[{id,type:"mcq",question,promptText,options:[],correctAnswerIndex:0,explanation}]}', responseMimeType: 'application/json' },
    });
    res.json(JSON.parse(r.text || '{"questions":[]}'));
  } catch (e) { res.status(500).json({ error: 'Quiz failed' }); }
});

// 7. PRONUNCIATION CHECK
app.post('/api/check-pronunciation', async (req, res) => {
  try {
    const { expectedText, transcript, targetLang = 'es' } = req.body;
    if (!expectedText || !transcript) return res.status(400).json({ error: 'expectedText and transcript required' });
    const ai = getGeminiClient();
    const r = await callGemini(ai, {
      contents: `Expected: "${expectedText}". Spoken: "${transcript}". Language: ${targetLang}. Score 0-100. Return JSON: {score,transcript,feedbackText,strengths:[],improvements:[],phoneticComparison}`,
      config: { systemInstruction: 'Return JSON.', responseMimeType: 'application/json' },
    });
    res.json(JSON.parse(r.text || '{}'));
  } catch (e) { res.status(500).json({ error: 'Pronunciation check failed' }); }
});

// 8. URBAN SLANG
app.post('/api/generate-urban-slang', async (req, res) => {
  try {
    const { targetLang = 'el', category = 'street slang' } = req.body;
    const ai = getGeminiClient();
    const r = await callGemini(ai, {
      contents: `Generate 6 ${category} phrases in ${targetLang}. Return JSON: {slangList:[{phrase,phonetic,meaning,literalTranslation,culturalNote,register}]}`,
      config: { systemInstruction: 'Return JSON.', responseMimeType: 'application/json' },
    });
    res.json(JSON.parse(r.text || '{"slangList":[]}'));
  } catch (e) { res.status(500).json({ error: 'Slang failed' }); }
});

// 9. STARTER DECK
app.post('/api/generate-starter-deck', async (req, res) => {
  try {
    const { targetLang = 'el', langName = 'Greek' } = req.body;
    const ai = getGeminiClient();
    const r = await callGemini(ai, {
      contents: `Generate 32-phrase 4-level deck for ${langName} (${targetLang}). Return JSON: {levels:[{levelNumber,levelTitle,description,items:[{sourceText,translatedText,phonetic,grammarNote,tags}]}]}`,
      config: { systemInstruction: 'Return JSON.', responseMimeType: 'application/json' },
    });
    res.json(JSON.parse(r.text || '{"levels":[]}'));
  } catch (e) { res.status(500).json({ error: 'Deck failed' }); }
});

// Spa fallback (for client-side routing)
app.get('*', (_, res) => {
  res.json({ status: 'Polyglotbot API is running' });
});

exports.handler = serverless(app);