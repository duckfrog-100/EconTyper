"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MutableRefObject } from "react";
import { DictionaryWord } from "@/components/practice/dictionary-word";
import { SentenceTranslation } from "@/components/practice/sentence-translation";
import { getNextDictionaryIndex } from "@/lib/dictionary/roving-index";
import {
  buildCharacterStates,
  calculateAccuracy,
  isTypingComplete,
  type PracticeSentence,
} from "@/lib/practice-utils";
import type { SavedWord } from "@/types/vocabulary";

function getDictionaryWords(sentence: string): string[] {
  return sentence.split(/(\s+)/).filter((part) => /[A-Za-z]/.test(part));
}

function buildSentenceParts(
  sentence: string,
): Array<{ key: string; text: string; isWord: boolean }> {
  return sentence.split(/(\s+)/).map((part, index) => ({
    key: `${part}-${index}`,
    text: part,
    isWord: /[A-Za-z]/.test(part),
  }));
}

export type PracticeSentenceCardProps = {
  index: number;
  sentence: PracticeSentence;
  typed: string;
  isActive: boolean;
  hadWrongAttempt: boolean;
  isSpeaking: boolean;
  speechSupported: boolean;
  dictationMode: boolean;
  revealed: boolean;
  showTranslations: boolean;
  textStyle: CSSProperties;
  sourceTitle: string;
  isLast: boolean;
  cardRefs: MutableRefObject<Array<HTMLElement | null>>;
  inputRefs: MutableRefObject<Array<HTMLTextAreaElement | null>>;
  onActivate: (index: number, scroll?: boolean) => void;
  onPlay: (index: number) => void;
  onTyped: (index: number, value: string) => void;
  onReveal: (index: number) => void;
  onFocusSentence: (index: number) => void;
  onToggleSaved: (word: SavedWord) => void;
  practiceSessionId: string;
};

export const PracticeSentenceCard = memo(function PracticeSentenceCard({
  index,
  sentence,
  typed,
  isActive,
  hadWrongAttempt,
  isSpeaking,
  speechSupported,
  dictationMode,
  revealed,
  showTranslations,
  textStyle,
  sourceTitle,
  isLast,
  cardRefs,
  inputRefs,
  onActivate,
  onPlay,
  onTyped,
  onReveal,
  onFocusSentence,
  onToggleSaved,
  practiceSessionId,
}: PracticeSentenceCardProps) {
  const typedCharacters = Array.from(typed);
  const targetCharacters = Array.from(sentence.text);
  const states = buildCharacterStates(sentence.text, typed);
  const complete = isTypingComplete(sentence.text, typed);
  const accuracy = calculateAccuracy(sentence.text, typed);
  const originalVisible = !dictationMode || revealed || complete;

  // ── roving tabindex ──
  const dictionaryWords = useMemo(() => getDictionaryWords(sentence.text), [sentence.text]);
  const wordCount = dictionaryWords.length;
  const [focusedDictionaryIndex, setFocusedDictionaryIndex] = useState(0);

  // inactive or no words → focal index 무의미: 첫 단어로 초기화
  useEffect(() => {
    setFocusedDictionaryIndex(0);
  }, [isActive, wordCount]);

  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleRegisterButton = useCallback(
    (wordIdx: number, element: HTMLButtonElement | null) => {
      if (element) {
        buttonRefs.current[wordIdx] = element;
      } else if (buttonRefs.current[wordIdx] === element) {
        buttonRefs.current[wordIdx] = null;
      }
    },
    [],
  );

  const moveFocus = useCallback(
    (nextIdx: number) => {
      setFocusedDictionaryIndex(nextIdx);
      buttonRefs.current[nextIdx]?.focus();
    },
    [],
  );

  const handleMovePrevious = useCallback(
    (currentIdx: number) => {
      const next = getNextDictionaryIndex(currentIdx, "previous", wordCount);
      if (next !== currentIdx) moveFocus(next);
    },
    [wordCount, moveFocus],
  );

  const handleMoveNext = useCallback(
    (currentIdx: number) => {
      const next = getNextDictionaryIndex(currentIdx, "next", wordCount);
      if (next !== currentIdx) moveFocus(next);
    },
    [wordCount, moveFocus],
  );

  // ── render ──
  const sentenceParts = useMemo(() => buildSentenceParts(sentence.text), [sentence.text]);
  let wordIdx = 0;

  return (
    <section ref={(element) => { cardRefs.current[index] = element; }} className={`${sentence.paragraphStart && index > 0 ? "mt-12" : ""} rounded-xl border bg-white p-5 transition dark:bg-zinc-900 sm:p-6 ${isActive ? "border-emerald-300/70 dark:border-emerald-700/60" : "border-zinc-200 dark:border-zinc-800"}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500">
        <span>{index + 1}번째 문장</span>
        <div className="flex items-center gap-2">
          {hadWrongAttempt && <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">실수 기록</span>}
          <button type="button" disabled={!speechSupported} onClick={() => onPlay(index)} className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition disabled:opacity-40 ${isSpeaking ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300" : "border-zinc-200 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400"}`}>{isSpeaking ? "■ 정지" : "▶ 듣기"}</button>
          <span>{complete ? "완료" : typed ? `정확도 ${accuracy}%` : "대기"}</span>
        </div>
      </div>

      <div className="mt-5">
        {originalVisible ? (
          <>
            <p className="mb-3 text-[10px] text-zinc-400 dark:text-zinc-500">단어를 가리키거나 눌러 뜻 확인 · 더블클릭하면 복사</p>
            <p className="text-zinc-700 dark:text-zinc-300" style={textStyle}>
              {sentenceParts.map((part) => {
                if (!part.isWord) {
                  return <span key={part.key}>{part.text}</span>;
                }
                const currentIdx = wordIdx;
                wordIdx += 1;
                return (
                  <DictionaryWord
                    key={part.key}
                    word={part.text}
                    sentence={sentence.text}
                    sourceTitle={sourceTitle}
                    practiceSessionId={practiceSessionId}
                    onToggleSaved={onToggleSaved}
                    tabIndex={
                      isActive && wordCount > 0 && currentIdx === focusedDictionaryIndex
                        ? 0
                        : -1
                    }
                    onMovePrevious={() => handleMovePrevious(currentIdx)}
                    onMoveNext={() => handleMoveNext(currentIdx)}
                    onRegisterButton={(element) => handleRegisterButton(currentIdx, element)}
                  />
                );
              })}
            </p>
            <div className="mt-3">
              <SentenceTranslation sentence={sentence.text} showAll={showTranslations} />
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-5 py-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
            <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">원문이 가려져 있습니다. 문장을 듣고 입력해 보세요.</p>
            <button type="button" onClick={() => onReveal(index)} className="mt-3 text-xs font-semibold text-zinc-500 underline underline-offset-4">원문 잠시 보기</button>
          </div>
        )}
      </div>

      <div onClick={() => onActivate(index)} className="relative mt-6 min-h-36 cursor-text rounded-xl border border-zinc-200 bg-zinc-50 p-5 outline-none dark:border-zinc-700 dark:bg-zinc-950 sm:p-6">
        <p aria-hidden="true" className="whitespace-pre-wrap break-words" style={textStyle}>
          {states.map(({ character, displayCharacter, state }, characterIndex) => (
            <span key={`${character}-${characterIndex}`}>
              {isActive && characterIndex === typedCharacters.length && <span className="typing-caret" />}
              <span className={state === "correct" ? "text-zinc-950 dark:text-zinc-50" : state === "incorrect" ? "rounded-sm bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400" : "text-zinc-300 dark:text-zinc-700"}>{displayCharacter}</span>
            </span>
          ))}
          {isActive && typedCharacters.length === targetCharacters.length && <span className="typing-caret" />}
          {typedCharacters.length > targetCharacters.length && <span className="rounded-sm bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400">{typedCharacters.slice(targetCharacters.length).join("")}</span>}
        </p>
        <textarea ref={(element) => { inputRefs.current[index] = element; }} value={typed} onChange={(event) => onTyped(index, event.target.value)} onFocus={() => onFocusSentence(index)} onPaste={(event) => event.preventDefault()} spellCheck={false} autoCorrect="off" autoCapitalize="off" aria-label={`${index + 1}번째 문장 입력`} className="absolute inset-0 h-full w-full resize-none opacity-0" />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className={`text-xs ${complete ? "text-emerald-600" : "text-zinc-400 dark:text-zinc-500"}`}>{complete ? "문장을 정확히 입력했습니다." : "입력한 글자가 다르면 빨간색으로 표시됩니다."}</p>
        {!isLast && <button type="button" onClick={() => onActivate(index + 1, true)} className="shrink-0 rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700">다음 문장 ↓</button>}
      </div>
    </section>
  );
});