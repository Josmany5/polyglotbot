// Polyglotbot Netlify Function — all API endpoints
// Uses Gemini REST API directly (fetch) to avoid SDK ESM/bundling issues

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const MODELS = ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.0-flash'];

async function gemini(prompt, systemPrompt = '') {
  let lastErr = null;
  for (const model of MODELS) {
    try {
      const contents = systemPrompt
        ? [{ role: 'user', parts: [{ text: systemPrompt + '\n\n' + prompt }] }]
        : [{ parts: [{ text: prompt }] }];
      const res = await fetch(`${BASE}/${model}:generateContent?key=${GEMINI_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents }),
      });
      if (!res.ok) { const errText = await res.text(); throw new Error(errText); }
      const data = await res.json();
      return data.candidates[0].content.parts[0].text;
    } catch (e) { lastErr = e; }
  }
  throw lastErr;
}

function jsonResponse(data, status = 200) {
  return { statusCode: status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) };
}

// Cache (in-memory, per function instance)
const cache = new Map();
const MAX = 300;
function cacheGet(k) { return cache.get(k); }
function cacheSet(k, v) {
  if (cache.size >= MAX) { const oldest = cache.keys().next().value; if (oldest) cache.delete(oldest); }
  cache.set(k, v);
}

exports.handler = async (event) => {
  const path = event.path.replace('/.netlify/functions/api', '');
  const method = event.httpMethod;

  try {
    // 1. TRANSLATE
    if (path === '/api/translate' && method === 'POST') {
      const { text, sourceLang = 'auto', targetLang = 'es', langName } = JSON.parse(event.body || '{}');
      const langLabel = langName || targetLang;
      if (!text?.trim()) return jsonResponse({ error: 'Text required' }, 400);
      const ck = `t:${sourceLang}:${targetLang}:${text.trim().toLowerCase()}`;
      const cached = cacheGet(ck);
      if (cached) return jsonResponse({ ...cached, isCached: true });

      const result = await gemini(
        `Translate the following text from ${sourceLang} to ${targetLang}: "${text.trim()}".

Return a JSON object with these fields: translatedText, overallPhonetic, sentences (array of {sourceSentence, translatedSentence, phonetic, wordBreakdown: [{original, phonetic, translation, pos, note}]}), slangInsights (array of {phrase, meaning, literalTranslation, culturalNote, register}), grammarNotes (array of strings), alternativeTranslations (array of {phrase: "alternative way to say it in ${langLabel}", phonetic: "Latin transliteration", literalMeaning: "literal meaning in ${sourceLang}"}), formalityLevel, sourceLang, targetLang, detectedSourceLang, sourceText. Include 2-4 alternative translations covering formal, neutral, and casual registers.

Write all grammar notes, slang meanings, cultural notes in ${sourceLang}. GRAMMAR NOTES: Include phonetic and English translation inline for any example words (e.g. "'ιδωθούμε' [idouthoúme] means 'we see each other'"). WORD BREAKDOWN NOTES: Use a simple "Meaning: [English] / Used like: [plain explanation]" format. Avoid technical jargon in notes — explain terms simply. CRITICAL: In wordBreakdown, "original" MUST be the ${targetLang} word in native script, "translation" MUST be the meaning in ${sourceLang}. Never swap these fields.`,
        `You are a language tutor. Return ONLY valid JSON — no markdown, no code fences, no additional text. Phonetic must be clear Latin transliteration. Include all specified fields.`
      );
      const data = JSON.parse(stripJson(result));
      cacheSet(ck, data);
      return jsonResponse(data);
    }

    // 2. BATCH TRANSLATE
    if (path === '/api/batch-translate' && method === 'POST') {
      const { phrases, targetLang = 'es', langName } = JSON.parse(event.body || '{}');
      const langLabel = langName || targetLang;
      if (!Array.isArray(phrases) || !phrases.length) return jsonResponse({ error: 'phrases required' }, 400);

      const result = await gemini(
        `Translate EXACTLY these ${phrases.length} English phrases into ${langLabel} (NOT any other language). Do NOT change or rephrase. Each "translated" field MUST be in ${langLabel}. Return JSON: {"results": [${phrases.map(p => `{"id":"${p.id}","english":"${p.english}","translated":"...","phonetic":"...","grammarNote":"..."}`).join(',')}]}. All notes in plain English.`,
        `You are a precise translator. Translate into ${langLabel} only. Return ONLY valid JSON. Translate exactly as given.`
      );
      return jsonResponse(JSON.parse(stripJson(result)));
    }

    // 3. AI PRACTICE
    if (path === '/api/generate-practice' && method === 'POST') {
      const { category, targetLang = 'es', usedPhrases = [] } = JSON.parse(event.body || '{}');
      if (!category) return jsonResponse({ error: 'category required' }, 400);
      const avoid = usedPhrases.length > 0 ? `Do NOT use: ${usedPhrases.slice(0, 10).join(', ')}.` : '';

      const result = await gemini(
        `Generate a NEW practical ${category} phrase for ${targetLang}. ${avoid} Return JSON: {"english":"...","translated":"...","phonetic":"...","grammarNotes":["..."],"slangInsights":[{"phrase":"...","meaning":"...","literalTranslation":"...","culturalNote":"...","register":"casual"}]}`,
        'Generate fresh unique practice phrases. Never repeat. Return ONLY valid JSON.'
      );
      return jsonResponse(JSON.parse(stripJson(result)));
    }

    // 4. FREE TTS PROXY
    if (path === '/api/free-tts' && method === 'GET') {
      const { text, lang } = event.queryStringParameters || {};
      if (!text || !lang) return jsonResponse({ error: 'text and lang required' }, 400);
      const cleanLang = lang.split('-')[0].toLowerCase();
      const sanitized = text.replace(/\n/g, ' ').trim().slice(0, 200);
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(sanitized)}&tl=${cleanLang}&client=tw-ob`;
      const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!resp.ok) return jsonResponse({ error: 'TTS fetch failed' }, resp.status);
      const buffer = Buffer.from(await resp.arrayBuffer());
      return { statusCode: 200, headers: { 'Content-Type': 'audio/mpeg', 'Content-Length': buffer.length, 'Cache-Control': 'public, max-age=86400' }, body: buffer.toString('base64'), isBase64Encoded: true };
    }

    // 5. GEMINI TTS
    if (path === '/api/tts' && method === 'POST') {
      return jsonResponse({ audioBase64: null, useFallback: true });
    }

    // 6. QUIZ GENERATOR
    if (path === '/api/generate-quiz' && method === 'POST') {
      const { phrases = [], targetLang = 'es', topic = 'General' } = JSON.parse(event.body || '{}');
      const result = await gemini(
        `Generate 5 quiz questions for ${targetLang}. Topic: ${topic}. Context: ${JSON.stringify(phrases)}. Return JSON: {"questions":[{"id":"...","type":"mcq","question":"...","promptText":"...","options":["..."],"correctAnswerIndex":0,"explanation":"..."}]}`,
        'Return ONLY valid JSON.'
      );
      return jsonResponse(JSON.parse(stripJson(result)));
    }

    // 7. PRONUNCIATION CHECK
    if (path === '/api/check-pronunciation' && method === 'POST') {
      const { expectedText, transcript, targetLang = 'es' } = JSON.parse(event.body || '{}');
      if (!expectedText || !transcript) return jsonResponse({ error: 'expectedText and transcript required' }, 400);
      const result = await gemini(
        `Expected: "${expectedText}". Spoken: "${transcript}". Language: ${targetLang}. Score pronunciation 0-100. Return JSON: {"score":85,"transcript":"...","feedbackText":"...","strengths":["..."],"improvements":["..."],"phoneticComparison":"..."}`,
        'Return JSON pronunciation feedback.'
      );
      return jsonResponse(JSON.parse(stripJson(result)));
    }

    // 8. URBAN SLANG
    if (path === '/api/generate-urban-slang' && method === 'POST') {
      const { targetLang = 'el', category = 'street slang' } = JSON.parse(event.body || '{}');
      const result = await gemini(
        `Generate 6 ${category} phrases in ${targetLang}. Return JSON: {"slangList":[{"phrase":"...","phonetic":"...","meaning":"...","literalTranslation":"...","culturalNote":"...","register":"urban/slang"}]}`,
        'Return JSON.'
      );
      return jsonResponse(JSON.parse(stripJson(result)));
    }

    // 9. STARTER DECK
    if (path === '/api/generate-starter-deck' && method === 'POST') {
      const { targetLang = 'el', langName = 'Greek' } = JSON.parse(event.body || '{}');
      const result = await gemini(
        `Generate 32-phrase 4-level learning deck for ${langName} (${targetLang}). Return JSON: {"levels":[{"levelNumber":1,"levelTitle":"...","description":"...","items":[{"sourceText":"...","translatedText":"...","phonetic":"...","grammarNote":"...","tags":["..."]}]}]}`,
        'Return JSON.'
      );
      return jsonResponse(JSON.parse(stripJson(result)));
    }

    // Fallback
    return jsonResponse({ status: 'Polyglotbot API running', path, method });
  } catch (e) {
    console.error('API Error:', e.message);
    return jsonResponse({ error: 'Internal error', details: e.message }, 500);
  }
};

function stripJson(text) {
  // Remove markdown code fences if present
  return text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
}