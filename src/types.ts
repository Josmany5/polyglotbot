export type LanguageCode =
  | 'auto'
  | 'en'
  | 'es'
  | 'fr'
  | 'de'
  | 'it'
  | 'pt'
  | 'ru'
  | 'zh'
  | 'ja'
  | 'ko'
  | 'ar'
  | 'el';

export interface LanguageInfo {
  code: LanguageCode;
  name: string;
  nativeName: string;
  flag: string;
  voiceName: string;
  samplePhrase: string;
}

export interface WordBreakdown {
  original: string;
  phonetic: string;
  translation: string;
  pos: string; // e.g. "Noun", "Verb", "Idiom", "Particle"
  note?: string;
}

export interface SentenceBreakdown {
  sourceSentence: string;
  translatedSentence: string;
  phonetic: string;
  wordBreakdown: WordBreakdown[];
}

export interface SlangInsight {
  phrase: string;
  meaning: string;
  literalTranslation: string;
  culturalNote: string;
  register: 'casual' | 'urban/slang' | 'idiomatic' | 'polite';
}

export interface TranslationResult {
  sourceLang: LanguageCode;
  targetLang: LanguageCode;
  detectedSourceLang?: string;
  sourceText: string;
  translatedText: string;
  overallPhonetic: string; // Transliteration, Romaji, Pinyin, or IPA
  audioBase64?: string;
  sentences: SentenceBreakdown[];
  slangInsights: SlangInsight[];
  grammarNotes: string[];
  alternativeTranslations: string[];
  formalityLevel: 'formal' | 'neutral' | 'casual';
}

export interface Folder {
  id: string;
  name: string;
  description?: string;
  color: string; // Tailwind color class or hex
  icon: string; // Lucide icon name
  createdAt: number;
}

export interface SavedPhrase {
  id: string;
  folderId: string;
  sourceText: string;
  translatedText: string;
  sourceLang: LanguageCode;
  targetLang: LanguageCode;
  phonetic: string;
  slangInsights?: SlangInsight[];
  grammarNotes?: string[];
  notes?: string;
  masteryLevel: 'learning' | 'review' | 'mastered';
  tags: string[];
  createdAt: number;
  lastPracticed?: number;
}

export interface QuizQuestion {
  id: string;
  type: 'mcq_translation' | 'mcq_meaning' | 'fill_blank' | 'audio_listen';
  question: string;
  promptText?: string;
  audioText?: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  phraseId?: string;
}

export interface PronunciationFeedback {
  score: number; // 0 to 100
  transcript: string;
  feedbackText: string;
  strengths: string[];
  improvements: string[];
  phoneticComparison?: string;
}
