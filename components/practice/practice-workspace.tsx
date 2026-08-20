"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { PracticeResult } from "@/components/practice/practice-result";
import { PracticeSentenceCard } from "@/components/practice/practice-sentence-card";
import { TypingSettings } from "@/components/practice/typing-settings";
import { VocabularyDrawer } from "@/components/practice/vocabulary-drawer";
import { useSpeechSynthesis } from "@/hooks/use-speech-synthesis";
import { addPracticeHistoryEntry } from "@/lib/history-storage";
import { buildPracticeHistoryEntry } from "@/lib/practice-history-entry";
import { createPracticeRoute, buildRetryText, type PracticeRetryMode } from "@/lib/practice-retry";
import { createPracticeTimer, finishPracticeTimer, getElapsedSeconds, startPracticeTimer, type PracticeTimerState } from "@/lib/practice-timer";
import {
  calculateAggregateAccuracy,
  calculateWordsPerMinute,
  hasIncorrectCharacter,
  isTypingComplete,
  segmentSentences,
} from "@/lib/practice-utils";
import { getCurrentArticle, saveCurrentArticle } from "@/lib/session-storage";
import { focusTypingInputAtEnd } from "@/lib/typing-focus";
import { DEFAULT_TYPING_SETTINGS, normalizeTypingSettings, type TypingSettingsValue } from "@/lib/typing-settings";
import { loadTypingSettings, saveTypingSettings } from "@/lib/typing-settings-storage";
import {
  normalizeWord,
  readSavedWords,
  readSessionWords,
  upsertWord,
  writeSavedWords,
  writeSessionWords,
} from "@/lib/vocabulary-storage";
import type { PracticeArticle } from "@/types/article";
import type { SavedWord } from "@/types/vocabulary";

/**
 * 문장 완료 후 다음 문장으로 자동 이동/재생하기 전 지연 (밀리초).
 * 사용자가 마지막 글자를 입력한 직후 결과를 시각적으로 확인할 수 있을 정도의 짧은 간격.
 */
const NEXT_SENTENCE_DELAY_MS = 180;

export function PracticeWorkspace({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [article, setArticle] = useState<PracticeArticle | null | undefined>(undefined);
  const [typedBySentence, setTypedBySentence] = useState<Record<number, string>>({});
  const [revealedBySentence, setRevealedBySentence] = useState<Record<number, boolean>>({});
  const [wrongAttemptIndices, setWrongAttemptIndices] = useState<Set<number>>(new Set());
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [vocabularyOpen, setVocabularyOpen] = useState(false);
  const [settings, setSettings] = useState<TypingSettingsValue>(() => loadTypingSettings(DEFAULT_TYPING_SETTINGS, normalizeTypingSettings));
  const [timer, setTimer] = useState<PracticeTimerState>(createPracticeTimer);
  const [nowTickMs, setNowTickMs] = useState(() => Date.now());
  const [sessionWords, setSessionWords] = useState<SavedWord[]>([]);
  const [savedWords, setSavedWords] = useState<SavedWord[]>([]);
  const inputRefs = useRef<Array<HTMLTextAreaElement | null>>([]);
  const cardRefs = useRef<Array<HTMLElement | null>>([]);
  const savedCompletionRef = useRef<string | null>(null);
  const settingsTriggerRef = useRef<HTMLButtonElement | null>(null);
  const settingsDialogId = useId();
  const settingsTitleId = useId();
  const { supported: speechSupported, speakingIndex, speak, stop } = useSpeechSynthesis();

  // ---------- refs for callback-safe latest values ----------
  const typedBySentenceRef = useRef(typedBySentence);
  typedBySentenceRef.current = typedBySentence;

  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const speechSupportedRef = useRef(speechSupported);
  speechSupportedRef.current = speechSupported;
  const speakRef = useRef(speak);
  speakRef.current = speak;

  // 타이머 ref: 다음 문장 자동 이동/재생 예약 관리
  const nextSentenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---------- sentences & styles ----------
  const sentences = useMemo(() => segmentSentences(article?.text ?? ""), [article?.text]);

  // sentencesRef는 sentences가 정의된 후 ref.current를 설정한다
  const sentencesRef = useRef(sentences);
  sentencesRef.current = sentences;

  const textStyle = useMemo<React.CSSProperties>(() => ({
    fontSize: `${settings.fontSize}px`,
    fontWeight: settings.fontWeight,
    lineHeight: settings.lineHeight,
    fontFamily: settings.fontFamily === "serif" ? "Georgia, Cambria, 'Times New Roman', serif" : "Inter, ui-sans-serif, system-ui, sans-serif",
  }), [settings]);

  // ---------- session reset ----------
  useEffect(() => {
    const storedArticle = getCurrentArticle();
    setArticle(sessionId && storedArticle?.id === sessionId ? storedArticle : null);
    setTypedBySentence({});
    setRevealedBySentence({});
    setWrongAttemptIndices(new Set());
    setSummaryOpen(false);
    setActiveIndex(0);
    setSettings(loadTypingSettings(DEFAULT_TYPING_SETTINGS, normalizeTypingSettings));
    setSessionWords(readSessionWords(sessionId));
    setSavedWords(readSavedWords());
    setVocabularyOpen(false);
    setTimer(createPracticeTimer());
    savedCompletionRef.current = null;

    // 예약된 다음-문장 타이머 정리
    if (nextSentenceTimerRef.current !== null) {
      clearTimeout(nextSentenceTimerRef.current);
      nextSentenceTimerRef.current = null;
    }
    stop();
  }, [sessionId, stop]);

  // ---------- derived metrics ----------
  const completedCount = sentences.reduce(
    (count, sentence, index) => count + (isTypingComplete(sentence.text, typedBySentence[index] ?? "") ? 1 : 0),
    0,
  );
  const totalTyped = Object.values(typedBySentence).reduce((sum, value) => sum + Array.from(value).length, 0);
  const aggregateAccuracy = calculateAggregateAccuracy(
    sentences.map((s) => s.text),
    sentences.map((_, index) => typedBySentence[index] ?? ""),
  );
  const allComplete = sentences.length > 0 && completedCount === sentences.length;
  const elapsedSeconds = getElapsedSeconds(timer, nowTickMs);
  const wordsPerMinute = calculateWordsPerMinute(totalTyped, elapsedSeconds);

  // ---------- completion persistence ----------
  useEffect(() => {
    if (!allComplete || !article) return;

    const completionKey = `${sessionId}:${completedCount}:${sentences.length}`;
    if (savedCompletionRef.current === completionKey) return;
    savedCompletionRef.current = completionKey;

    const finishedAtMs = Date.now();
    setTimer((current) => finishPracticeTimer(current, finishedAtMs));

    const completionElapsedSeconds = getElapsedSeconds({ startedAtMs: timer.startedAtMs, endedAtMs: finishedAtMs }, finishedAtMs);
    const completionWordsPerMinute = calculateWordsPerMinute(totalTyped, completionElapsedSeconds);

    addPracticeHistoryEntry(buildPracticeHistoryEntry({
      id: crypto.randomUUID(),
      article,
      completedAt: new Date(finishedAtMs).toISOString(),
      accuracy: aggregateAccuracy,
      typedCharacters: totalTyped,
      wrongSentenceCount: wrongAttemptIndices.size,
      sessionWordCount: sessionWords.length,
      savedWordCount: savedWords.length,
      sentenceCount: sentences.length,
      wordsPerMinute: completionWordsPerMinute,
      elapsedSeconds: completionElapsedSeconds,
    }));
    setSummaryOpen(true);
  }, [aggregateAccuracy, allComplete, article, completedCount, savedWords.length, sentences.length, sessionId, sessionWords.length, timer.startedAtMs, totalTyped, wrongAttemptIndices.size]);

  // ---------- summary timer tick ----------
  useEffect(() => {
    if (!summaryOpen || timer.endedAtMs !== null) return;
    setNowTickMs(Date.now());
    const interval = window.setInterval(() => setNowTickMs(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [summaryOpen, timer.endedAtMs]);

  // ---------- settings ----------
  function updateSettings(next: TypingSettingsValue) {
    setSettings(next);
    saveTypingSettings(next);
  }

  // ---------- vocabulary ----------
  function storeSessionWords(next: SavedWord[]) {
    setSessionWords(next);
    writeSessionWords(sessionId, next);
  }

  function storeSavedWords(next: SavedWord[]) {
    setSavedWords(next);
    writeSavedWords(next);
  }


  function handleToggleSaved(word: SavedWord) {
    const normalized = normalizeWord(word.word);
    const exists = savedWords.some((savedWord) => normalizeWord(savedWord.word) === normalized);
    storeSavedWords(exists
      ? savedWords.filter((savedWord) => normalizeWord(savedWord.word) !== normalized)
      : upsertWord(savedWords, word));
  }

  function handleDeleteSessionWord(word: SavedWord) {
    const normalized = normalizeWord(word.word);
    storeSessionWords(sessionWords.filter((sessionWord) => normalizeWord(sessionWord.word) !== normalized));
  }

  function handleImportCsv(importedWords: SavedWord[]) {
    storeSavedWords(importedWords.reduce((words, word) => upsertWord(words, word), savedWords));
  }

  // ---------- sentence navigation ----------
  const activateSentence = useCallback((index: number, scroll = false) => {
    setActiveIndex(index);
    if (scroll) cardRefs.current[index]?.scrollIntoView({ behavior: "smooth", block: "center" });
    // focus()만 호출하면 브라우저가 이전 selection을 복원해 caret이 중간에 남을 수 있다.
    // 필사 입력은 끝에서만 이어가므로 caret을 현재 값의 끝으로 복원한다.
    window.setTimeout(() => focusTypingInputAtEnd(inputRefs.current[index]), 0);
  }, []);

  // activateSentenceRef는 activateSentence가 정의된 후 초기화
  const activateSentenceRef = useRef(activateSentence);
  activateSentenceRef.current = activateSentence;

  // ---------- speech: manual play ----------
  const playSentence = useCallback((index: number) => {
    const sentence = sentences[index];
    if (!sentence || !speechSupported) return;
    if (speakingIndex === index) {
      stop();
      return;
    }
    activateSentence(index);
    speak({ index, text: sentence.text, locale: settings.speechLocale, rate: settings.speechRate });
  }, [sentences, speechSupported, speakingIndex, stop, activateSentence, speak, settings.speechLocale, settings.speechRate]);

  // ---------- timed next-sentence (auto-advance + optional auto-play) ----------
  const scheduleNextSentence = useCallback((nextIndex: number) => {
    // 이전 예약 취소 (연속 완료 시 마지막만 유효)
    if (nextSentenceTimerRef.current !== null) {
      clearTimeout(nextSentenceTimerRef.current);
    }

    nextSentenceTimerRef.current = setTimeout(() => {
      nextSentenceTimerRef.current = null;

      // ref에서 최신 값 사용
      const latestSentences = sentencesRef.current;
      const latestSettings = settingsRef.current;
      const latestSpeechSupported = speechSupportedRef.current;
      const latestSpeak = speakRef.current;
      const latestActivate = activateSentenceRef.current;

      const sentence = latestSentences[nextIndex];
      if (!sentence) return;

      latestActivate(nextIndex, true);
      if (latestSettings.autoPlayNext && latestSpeechSupported) {
        latestSpeak({
          index: nextIndex,
          text: sentence.text,
          locale: latestSettings.speechLocale,
          rate: latestSettings.speechRate,
        });
      }
    }, NEXT_SENTENCE_DELAY_MS);
  }, []);

  // ---------- typing handler ----------
  const updateTyped = useCallback((index: number, value: string) => {
    const normalized = value.replace(/\r?\n/g, " ");
    if (normalized) {
      setTimer((current) => startPracticeTimer(current, Date.now()));
    }
    const target = sentences[index]?.text ?? "";

    // wrong attempt tracking (pure updater)
    if (hasIncorrectCharacter(target, normalized)) {
      setWrongAttemptIndices((current) => {
        if (current.has(index)) return current;
        const next = new Set(current);
        next.add(index);
        return next;
      });
    }

    // 완료 전이 감지: ref에서 최신 typed 상태 읽기 (updater 의존 제거)
    const wasComplete = isTypingComplete(target, typedBySentenceRef.current[index] ?? "");
    const nowComplete = isTypingComplete(target, normalized);

    // typed state 업데이트 (순수 updater, side effect 없음)
    setTypedBySentence((current) => ({ ...current, [index]: normalized }));

    // 완료 전이 발생 시 다음 문장 예약 (updater 외부, ref 기반)
    if (!wasComplete && nowComplete && index < sentences.length - 1) {
      scheduleNextSentence(index + 1);
    }
  }, [sentences, scheduleNextSentence]);

  // ---------- retry ----------
  const revealSentence = useCallback((index: number) => {
    setRevealedBySentence((current) => ({ ...current, [index]: true }));
  }, []);

  function startRetry(text: string, titleSuffix: string, mode: PracticeRetryMode) {
    if (!article || !text.trim()) return;
    const nextArticle: PracticeArticle = {
      ...article,
      id: crypto.randomUUID(),
      title: `${article.title} · ${titleSuffix}`,
      text,
      createdAt: new Date().toISOString(),
    };
    saveCurrentArticle(nextArticle);
    router.push(createPracticeRoute(nextArticle.id, mode));
  }

  function retryWrong() {
    const text = buildRetryText(sentences.map((sentence) => sentence.text), wrongAttemptIndices);
    startRetry(text, "틀린 문장 복습", "wrong");
  }

  // ---------- render: loading ----------
  if (article === undefined) {
    return <main className="mx-auto max-w-3xl px-5 py-16 text-sm text-zinc-500">연습 내용을 불러오는 중입니다…</main>;
  }

  // ---------- render: no article ----------
  if (!article) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-5 py-16 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-zinc-500">진행 중인 연습 없음</p>
        <h1 className="mt-3 text-3xl font-semibold">먼저 연습할 글을 선택해 주세요.</h1>
        <p className="mt-4 text-zinc-600 dark:text-zinc-400">연습 내용은 시작한 탭에서만 유지됩니다.</p>
        <Link href="/" className="mx-auto mt-7 rounded-xl bg-zinc-950 px-5 py-3 font-medium text-white dark:bg-zinc-100 dark:text-zinc-950">홈으로 돌아가기</Link>
      </main>
    );
  }

  // ---------- render: summary ----------
  if (summaryOpen) {
    return (
      <PracticeResult
        sourceName={article.sourceName}
        title={article.title}
        completedCount={completedCount}
        totalSentences={sentences.length}
        totalTyped={totalTyped}
        accuracy={aggregateAccuracy}
        wordsPerMinute={wordsPerMinute}
        elapsedSeconds={elapsedSeconds}
        wrongCount={wrongAttemptIndices.size}
        sessionWords={sessionWords}
        savedWordsCount={savedWords.length}
        onRetryWrong={retryWrong}
        onRetryAll={() => startRetry(article.text, "전체 다시 연습", "all")}
        onReturnHome={() => router.push("/")}
      />
    );
  }

  // ---------- render: practice ----------
  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="inline-flex min-h-11 items-center rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold dark:border-zinc-700">← 홈으로</Link>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button type="button" onClick={() => setVocabularyOpen(true)} className="min-h-11 rounded-xl border border-zinc-200 px-4 text-xs font-semibold dark:border-zinc-800">단어장 ({savedWords.length})</button>
          <button type="button" onClick={() => updateSettings({ ...settings, dictationMode: !settings.dictationMode })} className={`min-h-11 rounded-xl border px-4 text-xs font-semibold transition ${settings.dictationMode ? "border-violet-200 bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300" : "border-zinc-200 text-zinc-600 dark:border-zinc-800 dark:text-zinc-300"}`}>{settings.dictationMode ? "듣고 쓰기 종료" : "듣고 쓰기"}</button>
          <button type="button" onClick={() => updateSettings({ ...settings, showTranslations: !settings.showTranslations })} className={`min-h-11 rounded-xl border px-4 text-xs font-semibold transition ${settings.showTranslations ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300" : "border-zinc-200 text-zinc-600 dark:border-zinc-800 dark:text-zinc-300"}`}>{settings.showTranslations ? "전체 해석 끄기" : "전체 해석 켜기"}</button>
          <button
            ref={settingsTriggerRef}
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={settingsOpen}
            aria-controls={settingsDialogId}
            className="min-h-11 rounded-xl border border-zinc-200 px-4 text-xs font-semibold dark:border-zinc-800"
          >
            필사 설정
          </button>
          {completedCount > 0 && (
            <button type="button" onClick={() => setSummaryOpen(true)} className="min-h-11 rounded-xl border border-emerald-200 px-4 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/30">결과 보기</button>
          )}
        </div>
      </div>

      <header className="mt-7 border-b border-zinc-200 pb-7 dark:border-zinc-800">
        <p className="text-sm text-emerald-700 dark:text-emerald-400">{article.sourceName}</p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">{article.title}</h1>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-zinc-500">
          <span>완료 {completedCount} / {sentences.length}문장</span>
          <span>입력 {totalTyped.toLocaleString()}자</span>
          <span>전체 정확도 {aggregateAccuracy}%</span>
          <span>실수 기록 {wrongAttemptIndices.size}문장</span>
          <span>현재 {Math.min(activeIndex + 1, sentences.length)}번째 문장</span>
        </div>
        {!speechSupported && <p className="mt-3 text-sm text-red-600">이 브라우저에서는 음성 재생 기능을 지원하지 않습니다.</p>}
      </header>

      <div className="mt-8 space-y-8">
        {sentences.map((sentence, index) => (
          <PracticeSentenceCard
            key={`${sentence.text}-${index}`}
            index={index}
            sentence={sentence}
            typed={typedBySentence[index] ?? ""}
            isActive={activeIndex === index}
            hadWrongAttempt={wrongAttemptIndices.has(index)}
            isSpeaking={speakingIndex === index}
            speechSupported={speechSupported}
            dictationMode={settings.dictationMode}
            revealed={revealedBySentence[index] ?? false}
            showTranslations={settings.showTranslations}
            textStyle={textStyle}
            sourceTitle={article.title}
            isLast={index === sentences.length - 1}
            cardRefs={cardRefs}
            inputRefs={inputRefs}
            onActivate={activateSentence}
            onPlay={playSentence}
            onTyped={updateTyped}
            onReveal={revealSentence}
            onFocusSentence={setActiveIndex}
            onToggleSaved={handleToggleSaved}
            practiceSessionId={sessionId}
          />
        ))}
      </div>

      <VocabularyDrawer open={vocabularyOpen} sessionWords={sessionWords} savedWords={savedWords} onClose={() => setVocabularyOpen(false)} onToggleSaved={handleToggleSaved} onDeleteSessionWord={handleDeleteSessionWord} onClearSessionWords={() => storeSessionWords([])} onImportCsv={handleImportCsv} />
      <TypingSettings
        open={settingsOpen}
        dialogId={settingsDialogId}
        titleId={settingsTitleId}
        value={settings}
        onChange={updateSettings}
        onClose={() => setSettingsOpen(false)}
        triggerRef={settingsTriggerRef}
      />
    </main>
  );
}