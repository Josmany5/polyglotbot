import React, { useState } from 'react';
import { QuizQuestion, SavedPhrase, LanguageCode } from '../types';
import { LANGUAGES } from '../data/languages';
import { speakWebSpeech } from '../utils/audio';
import { getCacheItem, setCacheItem, getQuizKey } from '../utils/cacheStore';
import {
  Sparkles,
  Volume2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Loader2,
  Award,
  RotateCcw,
  BookOpen,
} from 'lucide-react';

interface QuizTabProps {
  phrases: SavedPhrase[];
}

export const QuizTab: React.FC<QuizTabProps> = ({ phrases }) => {
  const [targetLang, setTargetLang] = useState<LanguageCode>('el');
  const [topic, setTopic] = useState<string>('Greetings & Slang');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [isQuizComplete, setIsQuizComplete] = useState<boolean>(false);

  const handleGenerateQuiz = async () => {
    setIsQuizComplete(false);
    setCurrentQIndex(0);
    setScore(0);
    setSelectedOption(null);
    setIsAnswered(false);

    const cacheKey = getQuizKey(targetLang, topic, phrases.length);
    const cachedQuestions = getCacheItem<QuizQuestion[]>(cacheKey);
    if (cachedQuestions && cachedQuestions.length > 0) {
      setQuestions(cachedQuestions);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phrases,
          targetLang,
          topic,
        }),
      });

      if (!response.ok) throw new Error('Quiz generation failed.');

      const data = await response.json();
      const qList = data.questions || [];
      if (qList.length > 0) {
        setCacheItem(cacheKey, qList);
      }
      setQuestions(qList);
    } catch (err) {
      console.error('Quiz error:', err);
      alert('Could not generate quiz at this time.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectOption = (index: number) => {
    if (isAnswered) return;
    setSelectedOption(index);
    setIsAnswered(true);

    const currentQ = questions[currentQIndex];
    if (index === currentQ.correctAnswerIndex) {
      setScore((prev) => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQIndex + 1 < questions.length) {
      setCurrentQIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setIsQuizComplete(true);
    }
  };

  const currentQ = questions[currentQIndex];
  const targetLangInfo = LANGUAGES.find((l) => l.code === targetLang);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Quiz Controls & Setup */}
      {questions.length === 0 || isQuizComplete ? (
        <div className="bg-white rounded-[32px] border-4 border-[#2D3436] shadow-[12px_12px_0px_0px_rgba(45,52,54,1)] p-6 sm:p-8 space-y-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#FFE66D] border-3 border-[#2D3436] flex items-center justify-center mx-auto text-[#2D3436] shadow-[4px_4px_0px_0px_rgba(45,52,54,1)]">
            <Sparkles className="w-8 h-8 text-[#FF6B6B] animate-bounce" />
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-black text-[#2D3436]">
              {isQuizComplete ? 'Quiz Completed! 🎉' : 'AI Interactive Language Quiz'}
            </h2>
            <p className="text-xs sm:text-sm font-bold text-[#636E72] max-w-md mx-auto">
              {isQuizComplete
                ? `You scored ${score} out of ${questions.length}! Great job practicing native phrases and grammar.`
                : 'Generate dynamic multiple choice, fill-in-the-blank, and listening comprehension quizzes powered by AI!'}
            </p>
          </div>

          {/* Setup Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto text-left">
            <div>
              <label className="block text-xs font-black uppercase text-[#636E72] mb-1">
                Target Language
              </label>
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value as LanguageCode)}
                className="w-full px-3.5 py-2.5 text-xs font-black rounded-xl border-2 border-[#2D3436] bg-[#FFE66D] text-[#2D3436] shadow-[2px_2px_0px_0px_rgba(45,52,54,1)] outline-none cursor-pointer"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.flag} {l.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-[#636E72] mb-1">
                Topic Preset
              </label>
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs font-black rounded-xl border-2 border-[#2D3436] bg-[#4ECDC4] text-white shadow-[2px_2px_0px_0px_rgba(45,52,54,1)] outline-none cursor-pointer"
              >
                <option value="Greetings & Slang">Greetings & Street Slang</option>
                <option value="Ordering Food & Dining">Ordering Food & Dining</option>
                <option value="Travel & Directions">Travel & Directions</option>
                <option value="Daily Basics">Everyday Basics</option>
                <option value="Saved Phrasebook">My Saved Phrasebook Decks</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleGenerateQuiz}
            disabled={isLoading}
            className="px-6 py-3.5 bg-[#FF6B6B] hover:bg-[#ff5252] text-white font-extrabold text-sm rounded-2xl border-2 border-[#2D3436] shadow-[4px_4px_0px_0px_rgba(45,52,54,1)] transition inline-flex items-center space-x-2 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Building Your Quiz...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>{isQuizComplete ? 'Start New Quiz' : 'Generate Quiz Now'}</span>
              </>
            )}
          </button>
        </div>
      ) : (
        /* Active Quiz Question Card */
        <div className="bg-white rounded-[32px] border-4 border-[#2D3436] shadow-[12px_12px_0px_0px_rgba(45,52,54,1)] p-6 sm:p-8 space-y-6">
          {/* Top Status */}
          <div className="flex items-center justify-between">
            <span className="px-3 py-1 rounded-full text-xs font-black bg-[#4ECDC4] text-white border-2 border-[#2D3436]">
              {targetLangInfo?.flag} {targetLangInfo?.name} Quiz
            </span>

            <div className="flex items-center space-x-3 text-xs font-black">
              <span className="text-[#636E72]">
                Question <strong className="text-[#FF6B6B]">{currentQIndex + 1}</strong> / {questions.length}
              </span>
              <span className="px-3 py-1 bg-[#FFE66D] text-[#2D3436] border border-[#2D3436] rounded-full">
                Score: {score}
              </span>
            </div>
          </div>

          {/* Question Text */}
          <div className="space-y-3">
            <h3 className="text-2xl font-black text-[#2D3436] leading-snug">
              {currentQ.question}
            </h3>

            {currentQ.promptText && (
              <p className="text-base font-extrabold text-[#2D3436] bg-[#F7F3E9] p-4 rounded-2xl border-2 border-[#2D3436] inline-block shadow-[3px_3px_0px_0px_rgba(45,52,54,1)]">
                "{currentQ.promptText}"
              </p>
            )}

            {currentQ.audioText && (
              <button
                onClick={() => speakWebSpeech(currentQ.audioText!, targetLang)}
                className="mt-2 px-4 py-2 bg-[#4ECDC4] text-white text-xs font-extrabold rounded-xl border-2 border-[#2D3436] shadow-[2px_2px_0px_0px_rgba(45,52,54,1)] hover:bg-[#3dbdb4] transition flex items-center space-x-2"
              >
                <Volume2 className="w-4 h-4" />
                <span>Play Listening Audio</span>
              </button>
            )}
          </div>

          {/* Answer Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {currentQ.options.map((option, idx) => {
              let btnStyle =
                'bg-white text-[#2D3436] border-2 border-[#2D3436] shadow-[3px_3px_0px_0px_rgba(45,52,54,1)] hover:bg-[#FFE66D]';

              if (isAnswered) {
                if (idx === currentQ.correctAnswerIndex) {
                  btnStyle = 'bg-[#4ECDC4] text-white border-2 border-[#2D3436] shadow-[4px_4px_0px_0px_rgba(45,52,54,1)]';
                } else if (idx === selectedOption) {
                  btnStyle = 'bg-[#FF6B6B] text-white border-2 border-[#2D3436] shadow-[4px_4px_0px_0px_rgba(45,52,54,1)]';
                } else {
                  btnStyle = 'opacity-40 bg-gray-100 text-[#2D3436] border border-gray-300';
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(idx)}
                  disabled={isAnswered}
                  className={`p-4 rounded-2xl text-left font-black text-sm transition-all flex items-center justify-between ${btnStyle}`}
                >
                  <span>{option}</span>
                  {isAnswered && idx === currentQ.correctAnswerIndex && (
                    <CheckCircle2 className="w-5 h-5 shrink-0 ml-2" />
                  )}
                  {isAnswered && idx === selectedOption && idx !== currentQ.correctAnswerIndex && (
                    <XCircle className="w-5 h-5 shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Explanation Box */}
          {isAnswered && (
            <div className="p-4 bg-[#FFE66D] rounded-2xl border-2 border-[#2D3436] shadow-[4px_4px_0px_0px_rgba(45,52,54,1)] space-y-2 animate-fade-in text-xs sm:text-sm">
              <div className="flex items-center space-x-1.5 font-black text-[#2D3436]">
                <HelpCircle className="w-4 h-4 text-[#FF6B6B]" />
                <span>Tutor Explanation:</span>
              </div>
              <p className="text-[#2D3436] font-bold leading-relaxed">
                {currentQ.explanation}
              </p>
            </div>
          )}

          {/* Next Button */}
          {isAnswered && (
            <div className="flex justify-end pt-2">
              <button
                onClick={handleNextQuestion}
                className="px-6 py-3 bg-[#FF6B6B] hover:bg-[#ff5252] text-white font-black text-xs sm:text-sm rounded-xl border-2 border-[#2D3436] shadow-[3px_3px_0px_0px_rgba(45,52,54,1)] transition flex items-center space-x-2"
              >
                <span>Next Question</span>
                <Sparkles className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
