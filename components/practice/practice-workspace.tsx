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

function InteractiveSentence({ sentence, muted = false, style }: { sentence: string; muted?: boolean; style?: React.CSSProperties }) {
  return (
    <p className={muted ? "text-zinc-400 dark:text-zinc-600" : "text-zinc-700 dark:text-zinc-300"} style={style}>
      {sentence.split(/(\s+)/).map((part, index) =>
        /[A-Za-z]/.test(part) && !muted ? <DictionaryWord key={`${part}-${index}`} word={part} /> : <span key={`${part}-${index}`}>{part}</span>,
      )}
    </p>
  );
}

export function PracticeWorkspace({ sessionId }: { sessionId: string }) {
  const [article, setArticle] = useState<PracticeArticle | null | undefined>(undefined);
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<TypingSettingsValue>(DEFAULT_TYPING_SETTINGS);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const storedArticle = getCurrentArticle();
    setArticle(sessionId && storedArticle?.id === sessionId ? storedArticle : null);
    setSentenceIndex(0);
    setTyped("");
    setSettings(loadSettings());
  }, [sessionId]);

  useEffect(() => {
    try {
      sessionStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {}
  }, [settings]);

  const sentences = useMemo(() => segmentSentences(article?.text ?? ""), [article?.text]);
  const sentence = sentences[sentenceIndex]?.text ?? "";
  const typedCharacters = Array.from(typed);
  const targetCharacters = Array.from(sentence);
  const characterStates = useMemo(() => buildCharacterStates(sentence, typed), [sentence, typed]);
  const isComplete = isTypingComplete(sentence, typed);
  const accuracy = calculateAccuracy(sentence, typed);
  const textStyle = useMemo<React.CSSProperties>(() => ({
    fontSize: `${settings.fontSize}px`, fontWeight: settings.fontWeight, lineHeight: settings.lineHeight,
    fontFamily: settings.fontFamily === "serif" ? "Georgia, Cambria, 'Times New Roman', serif" : "Inter, ui-sans-serif, system-ui, sans-serif",
  }), [settings]);

  function moveToSentence(nextIndex: number) {
    setSentenceIndex(nextIndex);
    setTyped("");
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  if (article === undefined) return <main className="mx-auto max-w-3xl px-5 py-16 text-sm text-zinc-500">Loading session…</main>;
  if (!article) return <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-5 py-16 text-center"><p className="text-sm font-semibold uppercase tracking-widest text-zinc-500">No active session</p><h1 className="mt-3 text-3xl font-semibold">Choose an article first.</h1><p className="mt-4 text-zinc-600 dark:text-zinc-400">Practice content belongs only to the tab and session where you started it.</p><Link href="/" className="mx-auto mt-7 rounded-2xl bg-zinc-950 px-5 py-3 font-medium text-white dark:bg-zinc-100 dark:text-zinc-950">Return home</Link></main>;

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
      <div className="flex items-center justify-between gap-4"><Link href="/" className="text-sm text-zinc-500">← Home</Link><button type="button" onClick={() => setSettingsOpen(true)} className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-semibold uppercase tracking-wider dark:border-zinc-800">Typing Settings ⚙</button></div>
      <header className="mt-7 border-b border-zinc-200 pb-7 dark:border-zinc-800"><p className="text-sm text-emerald-700 dark:text-emerald-400">{article.sourceName}</p><h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-4xl">{article.title}</h1><div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-zinc-500"><span>Sentence {Math.min(sentenceIndex + 1, sentences.length)} / {sentences.length}</span><span>Accuracy {accuracy}%</span><span>{typedCharacters.length} / {targetCharacters.length} characters</span></div></header>
      <section className="mt-7 rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 sm:p-8"><p className="mb-5 text-xs font-semibold uppercase tracking-widest text-zinc-500">Read · hover for Korean meaning · double-click to copy</p><div className="space-y-7">{settings.contextMode === "three" && sentenceIndex > 0 && <InteractiveSentence sentence={sentences[sentenceIndex - 1].text} muted style={textStyle} />}<InteractiveSentence sentence={sentence} style={textStyle} />{settings.contextMode === "three" && sentenceIndex < sentences.length - 1 && <InteractiveSentence sentence={sentences[sentenceIndex + 1].text} muted style={textStyle} />}</div></section>
      <section className="mt-6"><p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">Type the sentence</p><div role="textbox" tabIndex={0} onClick={() => inputRef.current?.focus()} className="relative min-h-48 cursor-text rounded-3xl border border-zinc-300 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 sm:p-8"><p aria-hidden="true" className="whitespace-pre-wrap break-words" style={textStyle}>{characterStates.map(({ character, displayCharacter, state }, index) => <span key={`${character}-${index}`}>{index === typedCharacters.length && <span className="typing-caret" />}<span className={state === "correct" ? "text-zinc-950 dark:text-zinc-50" : state === "incorrect" ? "rounded-sm bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400" : "text-zinc-300 dark:text-zinc-700"}>{displayCharacter}</span></span>)}{typedCharacters.length === targetCharacters.length && <span className="typing-caret" />}{typedCharacters.length > targetCharacters.length && <span className="rounded-sm bg-red-100 text-red-600">{typedCharacters.slice(targetCharacters.length).join("")}</span>}</p><textarea ref={inputRef} value={typed} onChange={(event) => setTyped(event.target.value.replace(/\r?\n/g, " "))} onPaste={(event) => event.preventDefault()} autoFocus spellCheck={false} autoCorrect="off" autoCapitalize="off" aria-label="Type the current sentence" className="absolute inset-0 h-full w-full resize-none opacity-0" /></div><div className="mt-5 flex items-center justify-between gap-3"><button type="button" disabled={sentenceIndex === 0} onClick={() => moveToSentence(sentenceIndex - 1)} className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium disabled:opacity-30 dark:border-zinc-700">Previous</button><p className={`text-center text-sm font-medium ${isComplete ? "text-emerald-600" : "text-zinc-500"}`}>{isComplete ? "Sentence complete" : "Red letters show what you actually typed"}</p><button type="button" disabled={!isComplete || sentenceIndex >= sentences.length - 1} onClick={() => moveToSentence(sentenceIndex + 1)} className="rounded-xl bg-zinc-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-30 dark:bg-zinc-100 dark:text-zinc-950">Next</button></div></section>
      <section aria-label="Advertisement" className="mt-10 flex min-h-24 items-center justify-center rounded-2xl border border-dashed border-zinc-300 px-4 text-center text-xs text-zinc-500 dark:border-zinc-700">Reserved for a future AdSense or Carbon Ads placement</section>
      <TypingSettings open={settingsOpen} value={settings} onChange={setSettings} onClose={() => setSettingsOpen(false)} />
    </main>
  );
}
