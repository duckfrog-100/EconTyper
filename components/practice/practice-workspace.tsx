"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { DictionaryWord } from "@/components/practice/dictionary-word";
import { DEFAULT_TYPING_SETTINGS, TypingSettings, type TypingSettingsValue } from "@/components/practice/typing-settings";
import { buildCharacterStates, calculateAccuracy, isTypingComplete, segmentSentences } from "@/lib/practice-utils";
import { getCurrentArticle } from "@/lib/session-storage";
import type { PracticeArticle } from "@/types/article";

const SETTINGS_KEY = "econtyper.typingSettings";

function isNumberInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

function loadSettings(): TypingSettingsValue {
  try {
    const raw = sessionStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_TYPING_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<TypingSettingsValue>;
    return {
      fontSize: isNumberInRange(parsed.fontSize, 18, 36) ? parsed.fontSize : DEFAULT_TYPING_SETTINGS.fontSize,
      fontWeight: isNumberInRange(parsed.fontWeight, 300, 700) ? parsed.fontWeight : DEFAULT_TYPING_SETTINGS.fontWeight,
      lineHeight: isNumberInRange(parsed.lineHeight, 1.3, 2.2) ? parsed.lineHeight : DEFAULT_TYPING_SETTINGS.lineHeight,
      fontFamily: parsed.fontFamily === "serif" || parsed.fontFamily === "sans" ? parsed.fontFamily : DEFAULT_TYPING_SETTINGS.fontFamily,
      contextMode: parsed.contextMode === "single" || parsed.contextMode === "three" ? parsed.contextMode : DEFAULT_TYPING_SETTINGS.contextMode,
    };
  } catch {
    return DEFAULT_TYPING_SETTINGS;
  }
}

function InteractiveSentence({ sentence, style }: { sentence: string; style: React.CSSProperties }) {
  return (
    <p className="text-zinc-700 dark:text-zinc-300" style={style}>
      {sentence.split(/(\s+)/).map((part, index) =>
        /[A-Za-z]/.test(part)
          ? <DictionaryWord key={`${part}-${index}`} word={part} />
          : <span key={`${part}-${index}`}>{part}</span>,
      )}
    </p>
  );
}

export function PracticeWorkspace({ sessionId }: { sessionId: string }) {
  const [article, setArticle] = useState<PracticeArticle | null | undefined>(undefined);
  const [typedBySentence, setTypedBySentence] = useState<Record<number, string>>({});
  const [activeIndex, setActiveIndex] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<TypingSettingsValue>(DEFAULT_TYPING_SETTINGS);
  const inputRefs = useRef<Array<HTMLTextAreaElement | null>>([]);
  const cardRefs = useRef<Array<HTMLElement | null>>([]);

  useEffect(() => {
    const storedArticle = getCurrentArticle();
    setArticle(sessionId && storedArticle?.id === sessionId ? storedArticle : null);
    setTypedBySentence({});
    setActiveIndex(0);
    setSettings(loadSettings());
  }, [sessionId]);

  useEffect(() => {
    try {
      sessionStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // 현재 화면에서는 설정을 계속 유지한다.
    }
  }, [settings]);

  const sentences = useMemo(() => segmentSentences(article?.text ?? ""), [article?.text]);
  const textStyle = useMemo<React.CSSProperties>(() => ({
    fontSize: `${settings.fontSize}px`,
    fontWeight: settings.fontWeight,
    lineHeight: settings.lineHeight,
    fontFamily: settings.fontFamily === "serif"
      ? "Georgia, Cambria, 'Times New Roman', serif"
      : "Inter, ui-sans-serif, system-ui, sans-serif",
  }), [settings]);

  const completedCount = sentences.reduce(
    (count, sentence, index) => count + (isTypingComplete(sentence.text, typedBySentence[index] ?? "") ? 1 : 0),
    0,
  );
  const totalTyped = Object.values(typedBySentence).reduce((sum, value) => sum + Array.from(value).length, 0);

  function activateSentence(index: number, scroll = false) {
    setActiveIndex(index);
    if (scroll) cardRefs.current[index]?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => inputRefs.current[index]?.focus(), 0);
  }

  function updateTyped(index: number, value: string) {
    setTypedBySentence((current) => ({
      ...current,
      [index]: value.replace(/\r?\n/g, " "),
    }));
  }

  if (article === undefined) {
    return <main className="mx-auto max-w-3xl px-5 py-16 text-sm text-zinc-500">연습 내용을 불러오는 중입니다…</main>;
  }

  if (!article) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-5 py-16 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-zinc-500">진행 중인 연습 없음</p>
        <h1 className="mt-3 text-3xl font-semibold">먼저 연습할 글을 선택해 주세요.</h1>
        <p className="mt-4 text-zinc-600 dark:text-zinc-400">연습 내용은 시작한 탭과 세션에서만 유지됩니다.</p>
        <Link href="/" className="mx-auto mt-7 rounded-2xl bg-zinc-950 px-5 py-3 font-medium text-white dark:bg-zinc-100 dark:text-zinc-950">홈으로 돌아가기</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
      <div className="flex items-center justify-between gap-4">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-100">← 홈</Link>
        <button type="button" onClick={() => setSettingsOpen(true)} className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-semibold tracking-wider dark:border-zinc-800">타이핑 설정 ⚙</button>
      </div>

      <header className="mt-7 border-b border-zinc-200 pb-7 dark:border-zinc-800">
        <p className="text-sm text-emerald-700 dark:text-emerald-400">{article.sourceName}</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-4xl">{article.title}</h1>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-zinc-500">
          <span>완료 {completedCount} / {sentences.length}문장</span>
          <span>입력 {totalTyped.toLocaleString()}자</span>
          <span>현재 {Math.min(activeIndex + 1, sentences.length)}번째 문장</span>
        </div>
      </header>

      <div className="mt-8 space-y-8">
        {sentences.map((sentence, index) => {
          const typed = typedBySentence[index] ?? "";
          const typedCharacters = Array.from(typed);
          const targetCharacters = Array.from(sentence.text);
          const states = buildCharacterStates(sentence.text, typed);
          const complete = isTypingComplete(sentence.text, typed);
          const accuracy = calculateAccuracy(sentence.text, typed);
          const active = activeIndex === index;

          return (
            <section
              key={`${sentence.text}-${index}`}
              ref={(element) => { cardRefs.current[index] = element; }}
              className={`${sentence.paragraphStart && index > 0 ? "mt-16" : ""} rounded-3xl border bg-white p-5 shadow-sm transition dark:bg-zinc-900 sm:p-8 ${active ? "border-emerald-500 ring-4 ring-emerald-500/10" : "border-zinc-200 dark:border-zinc-800"}`}
            >
              <div className="flex items-center justify-between gap-3 text-xs text-zinc-500">
                <span>{index + 1}번째 문장</span>
                <span>{complete ? "완료" : typed ? `정확도 ${accuracy}%` : "대기"}</span>
              </div>

              <div className="mt-5">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">원문 · 단어에 마우스를 올리면 뜻 보기 · 더블클릭하면 복사</p>
                <InteractiveSentence sentence={sentence.text} style={textStyle} />
              </div>

              <div
                role="textbox"
                tabIndex={0}
                onClick={() => activateSentence(index)}
                onFocus={() => activateSentence(index)}
                className="relative mt-6 min-h-36 cursor-text rounded-2xl border border-zinc-200 bg-zinc-50 p-5 outline-none dark:border-zinc-700 dark:bg-zinc-950 sm:p-6"
              >
                <p aria-hidden="true" className="whitespace-pre-wrap break-words" style={textStyle}>
                  {states.map(({ character, displayCharacter, state }, characterIndex) => (
                    <span key={`${character}-${characterIndex}`}>
                      {active && characterIndex === typedCharacters.length && <span className="typing-caret" />}
                      <span className={state === "correct"
                        ? "text-zinc-950 dark:text-zinc-50"
                        : state === "incorrect"
                          ? "rounded-sm bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400"
                          : "text-zinc-300 dark:text-zinc-700"}
                      >
                        {displayCharacter}
                      </span>
                    </span>
                  ))}
                  {active && typedCharacters.length === targetCharacters.length && <span className="typing-caret" />}
                  {typedCharacters.length > targetCharacters.length && (
                    <span className="rounded-sm bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400">
                      {typedCharacters.slice(targetCharacters.length).join("")}
                    </span>
                  )}
                </p>

                <textarea
                  ref={(element) => { inputRefs.current[index] = element; }}
                  value={typed}
                  onChange={(event) => updateTyped(index, event.target.value)}
                  onFocus={() => setActiveIndex(index)}
                  onPaste={(event) => event.preventDefault()}
                  spellCheck={false}
                  autoCorrect="off"
                  autoCapitalize="off"
                  aria-label={`${index + 1}번째 문장 입력`}
                  className="absolute inset-0 h-full w-full resize-none opacity-0"
                />
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <p className={`text-sm font-medium ${complete ? "text-emerald-600" : "text-zinc-500"}`}>
                  {complete ? "문장을 정확히 입력했습니다." : "입력한 글자가 다르면 빨간색으로 표시됩니다."}
                </p>
                {index < sentences.length - 1 && (
                  <button
                    type="button"
                    onClick={() => activateSentence(index + 1, true)}
                    className="shrink-0 rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700"
                  >
                    다음 문장 ↓
                  </button>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <section aria-label="광고" className="mt-12 flex min-h-24 items-center justify-center rounded-2xl border border-dashed border-zinc-300 px-4 text-center text-xs text-zinc-500 dark:border-zinc-700">향후 광고가 표시될 영역입니다.</section>
      <TypingSettings open={settingsOpen} value={settings} onChange={setSettings} onClose={() => setSettingsOpen(false)} />
    </main>
  );
}
