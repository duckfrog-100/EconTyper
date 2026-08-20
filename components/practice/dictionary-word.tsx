"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { normalizeWord } from "@/lib/vocabulary-storage";
import { createCacheKey, readCachedResponse, writeCachedResponse, clearV1Cache } from "@/lib/dictionary/cache";
import { createContextFingerprint } from "@/lib/dictionary/context";
import { createDictionaryListboxLabel, createDictionaryPopoverLabel, shouldCloseOnOutsideClick } from "@/lib/dictionary/popover";
import { resolvePreferredCandidate, resolvePreferenceSelection } from "@/lib/dictionary/ranking";
import { getCandidateKey } from "@/lib/dictionary/candidate-key";
import { preferenceService } from "@/lib/dictionary/preference-service";
import type { DictionaryCandidate, DictionaryResponse } from "@/types/dictionary";
import type { SavedWord } from "@/types/vocabulary";

let v1CacheCleared = false;
function ensureV1CacheCleared() {
  if (!v1CacheCleared && typeof window !== "undefined") {
    v1CacheCleared = true;
    clearV1Cache();
  }
}

const memoryCache = new Map<string, DictionaryResponse>();
const DISPLAY_CANDIDATE_LIMIT = 10;

type DictionaryWordProps = {
  word: string;
  sentence?: string;
  sourceTitle?: string;
  practiceSessionId?: string;
  onToggleSaved?: (word: SavedWord) => void;
  tabIndex?: number;
  onMovePrevious?: () => void;
  onMoveNext?: () => void;
  onRegisterButton?: (element: HTMLButtonElement | null) => void;
};

export function DictionaryWord({ word, sentence, sourceTitle, practiceSessionId, onToggleSaved, tabIndex, onMovePrevious, onMoveNext, onRegisterButton }: DictionaryWordProps) {
  const [response, setResponse] = useState<DictionaryResponse | null>(null);
  const [visible, setVisible] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"idle" | "copied" | "copy-error">("idle");
  const [selectedCandidateKey, setSelectedCandidateKey] = useState<string | null>(null);
  const [customMeaning, setCustomMeaning] = useState<string | undefined>(undefined);
  const [hasUserPreference, setHasUserPreference] = useState(false);
  const mountedRef = useRef(true);
  const loadingRef = useRef(false);
  const emittedRef = useRef(false);
  const wrapperRef = useRef<HTMLSpanElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const generatedId = useId();
  const popoverId = `dict-${generatedId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const normalized = normalizeWord(word);

  const fingerprint = sentence && normalized ? createContextFingerprint(sentence, normalized) : "";
  const cacheKey = createCacheKey(normalized, fingerprint);

  useEffect(() => {
    ensureV1CacheCleared();
  }, []);

  // ---------- roving tabindex button registration ----------
  useEffect(() => {
    if (onRegisterButton) {
      onRegisterButton(buttonRef.current);
      return () => onRegisterButton(null);
    }
    // onRegisterButton 의존 안 함: 등록/해제는 마운트/언마운트 시 1회만
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- cache helpers ----------
  function lookupFromCache(): DictionaryResponse | null {
    const mem = memoryCache.get(cacheKey);
    if (mem) return mem;

    const stored = readCachedResponse(cacheKey);
    if (stored) {
      memoryCache.set(cacheKey, stored);
      return stored;
    }
    return null;
  }

  function storeToCache(resp: DictionaryResponse) {
    memoryCache.set(cacheKey, resp);
    writeCachedResponse(cacheKey, resp);
  }

  // ---------- response / word 변경 시 preference 복원 ----------
  useEffect(() => {
    mountedRef.current = true;
    emittedRef.current = false;
    setListOpen(false);
    setCustomMeaning(undefined);
    setHasUserPreference(false);

    const cached = lookupFromCache();
    setResponse(cached ?? null);

    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  // response가 설정된 후 preference 복원
  useEffect(() => {
    if (!response) return;

    const preference = preferenceService.get(word);

    // custom preference: candidate 선택 없이 customMeaning을 직접 사용
    if (preference?.kind === "custom") {
      setSelectedCandidateKey(null);
      setCustomMeaning(preference.customMeaning);
      setHasUserPreference(true);
      return;
    }

    const { selectedKey } = resolvePreferenceSelection(response.candidates, preference ?? null);
    setSelectedCandidateKey((current) => (current === selectedKey ? current : selectedKey));
    setHasUserPreference(Boolean(selectedKey));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  // ---------- resolve preferred ----------
  const preferred = customMeaning
    ? undefined
    : response
      ? resolvePreferredCandidate(response.candidates, selectedCandidateKey)
      : undefined;

  const displayCandidates = response?.candidates.slice(0, DISPLAY_CANDIDATE_LIMIT) ?? [];

  const displayedMeaning = customMeaning ?? preferred?.meaning;
  const displayedSource = customMeaning ? undefined : preferred?.source;
  const displayedMatchedTerm = customMeaning ? undefined : preferred?.matchedTerm;
  const displayedPartOfSpeech = customMeaning ? undefined : preferred?.partOfSpeech;
  const displayedExample = customMeaning ? undefined : preferred?.example;
  const isCustomPreferred = Boolean(customMeaning);


  // ---------- popover 상태 ----------
  function closePopup(restoreFocus: boolean) {
    setVisible(false);
    setListOpen(false);
    if (restoreFocus) buttonRef.current?.focus();
  }

  // ---------- 조회 ----------
  function beginLookup(mode: "preview" | "pinned") {
    setVisible(true);
    setPinned(mode === "pinned");
    setError("");

    const cached = lookupFromCache();
    if (cached) {
      setResponse(cached);
      return;
    }
    if (response) return;
    if (loadingRef.current) return;

    loadingRef.current = true;

    const query = new URLSearchParams({ word: normalized });
    if (sentence) query.set("sentence", sentence);

    void fetch(`/api/dictionary?${query.toString()}`, { cache: "no-store" })
      .then(async (res) => {
        const payload = (await res.json()) as Partial<DictionaryResponse> & { message?: string };
        if (!res.ok || !Array.isArray(payload.candidates) || payload.candidates.length === 0) {
          throw new Error(payload.message || "단어 뜻을 찾지 못했습니다.");
        }
        const dictResponse: DictionaryResponse = {
          word: payload.word ?? normalized,
          candidates: payload.candidates,
          phonetic: payload.phonetic,
        };
        if (mountedRef.current) {
          storeToCache(dictResponse);
          setResponse(dictResponse);
          emittedRef.current = false;
        }
      })
      .catch((lookupError: unknown) => {
        if (mountedRef.current) {
          setError(lookupError instanceof Error ? lookupError.message : "단어 뜻을 불러오지 못했습니다.");
        }
      })
      .finally(() => {
        loadingRef.current = false;
      });
  }

  // ---------- handlers ----------
  function handleWrapperMouseLeave() {
    if (pinned) return;
    closePopup(false);
  }

  function handleWrapperBlur(event: React.FocusEvent) {
    if (pinned) return;
    const next = event.relatedTarget;
    if (next instanceof Node && wrapperRef.current?.contains(next)) return;
    closePopup(false);
  }

  function handleButtonClick() {
    if (visible && pinned) {
      closePopup(false);
      return;
    }
    beginLookup("pinned");
  }

  function handleSelectCandidate(candidate: DictionaryCandidate) {
    const key = getCandidateKey(candidate);
    setSelectedCandidateKey((current) => {
      if (current === key) return current;
      return key;
    });
    setCustomMeaning(undefined);
    setHasUserPreference(true);
    setListOpen(false);
    emittedRef.current = false;
    preferenceService.saveCandidate(word, key);
  }

  function handleResetPreference() {
    preferenceService.remove(word);
    setSelectedCandidateKey(null);
    setCustomMeaning(undefined);
    setHasUserPreference(false);
    setListOpen(false);
    emittedRef.current = false;
  }

  function toggleList(event: React.MouseEvent) {
    event.stopPropagation();
    setListOpen((prev) => !prev);
  }

  function handleRovingKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      onMovePrevious?.();
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      onMoveNext?.();
      return;
    }
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      event.stopPropagation();
      closePopup(pinned);
    }
  }

  function buildLookupWord(): SavedWord {
    return {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `w-${Date.now()}`,
      word,
      normalizedWord: normalized,
      meaning: displayedMeaning ?? "",
      partOfSpeech: displayedPartOfSpeech,
      exampleSentence: sentence,
      sourceTitle,
      dictionarySource: displayedSource,
      candidateKey: preferred ? getCandidateKey(preferred) : undefined,
      practiceSessionId,
      savedAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  async function handleDoubleClick() {
    setVisible(true);
    setError("");

    try {
      let resp = lookupFromCache();
      if (!resp) {
        const query = new URLSearchParams({ word: normalized });
        if (sentence) query.set("sentence", sentence);
        const res = await fetch(`/api/dictionary?${query.toString()}`, { cache: "no-store" });
        const payload = (await res.json()) as Partial<DictionaryResponse> & { message?: string };
        if (!res.ok || !Array.isArray(payload.candidates) || payload.candidates.length === 0) {
          throw new Error(payload.message || "단어 뜻을 찾지 못했습니다.");
        }
        resp = {
          word: payload.word ?? normalized,
          candidates: payload.candidates,
          phonetic: payload.phonetic,
        };
        storeToCache(resp);
      }
      if (mountedRef.current) {
        setResponse(resp);

        if (customMeaning) {
          await navigator.clipboard.writeText(`${normalized} — ${customMeaning}`);
          if (mountedRef.current) setStatus("copied");
        } else {
          const resolved = resolvePreferredCandidate(resp.candidates, selectedCandidateKey);
          if (resolved) {
            const clipText = resp.word === resolved.matchedTerm || !resolved.matchedTerm
              ? `${normalized} — ${resolved.meaning}`
              : `${resolved.matchedTerm} · ${resolved.meaning}`;
            await navigator.clipboard.writeText(clipText);
            if (mountedRef.current) setStatus("copied");
          }
        }
      }
    } catch {
      if (mountedRef.current) setStatus("copy-error");
    }

    window.setTimeout(() => mountedRef.current && setStatus("idle"), 1400);
  }

  // ---------- 외부 클릭 닫기 (visible일 때만 document listener) ----------
  useEffect(() => {
    if (!visible) return;

    function handleDocumentPointerDown(event: PointerEvent) {
      if (shouldCloseOnOutsideClick(event.target, wrapperRef.current)) {
        closePopup(false);
      }
    }

    document.addEventListener("pointerdown", handleDocumentPointerDown);
    return () => document.removeEventListener("pointerdown", handleDocumentPointerDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function sourceLabel(source: DictionaryCandidate["source"]): string | undefined {
    if (source.startsWith("glossary-")) return "경제·시사 용어";
    if (source === "ai") return "AI 추천";
    return undefined;
  }

  // ---------- render ----------
  return (
    <span
      ref={wrapperRef}
      className="relative inline-block"
      onMouseEnter={() => beginLookup("preview")}
      onMouseLeave={handleWrapperMouseLeave}
      onBlur={handleWrapperBlur}
      onDoubleClick={handleDoubleClick}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={handleButtonClick}
        onKeyDown={handleRovingKeyDown}
        tabIndex={tabIndex ?? 0}
        aria-haspopup="dialog"
        aria-expanded={visible}
        aria-controls={popoverId}
        className="cursor-help rounded px-0.5 text-inherit transition hover:bg-yellow-200 hover:text-zinc-950 focus:bg-yellow-200 focus:text-zinc-950 focus:outline-none dark:hover:bg-yellow-300 dark:focus:bg-yellow-300"
      >
        {word}
      </button>

      {visible && (
        <span
          id={popoverId}
          role="dialog"
          aria-modal="false"
          aria-label={createDictionaryPopoverLabel(normalized)}
          className="absolute bottom-full left-1/2 z-30 mb-2 w-72 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-xl border border-zinc-200 bg-white p-4 text-left text-xs leading-5 text-zinc-700 shadow-xl dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
          onKeyDown={handleKeyDown}
        >
          <div className="flex items-start justify-between gap-2">
            <strong className="block text-sm text-zinc-950 dark:text-zinc-50">{normalized}</strong>
            <div className="flex shrink-0 items-center gap-1">
              {onToggleSaved && displayedMeaning && (
                <button
                  type="button"
                  onClick={() => onToggleSaved(buildLookupWord())}
                  aria-label={`${normalized} 단어 저장`}
                  className="shrink-0 rounded-lg border border-amber-200 px-2 py-1 text-sm text-amber-500 transition hover:bg-amber-50 dark:border-amber-800 dark:hover:bg-amber-950/30"
                >
                  ★
                </button>
              )}
              <button
                type="button"
                onClick={() => closePopup(true)}
                aria-label="단어 뜻 팝오버 닫기"
                className="shrink-0 rounded-lg border border-zinc-200 px-2 py-1 text-[10px] font-semibold text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                닫기
              </button>
            </div>
          </div>

          {!displayedMeaning && !error && <span className="mt-2 block">뜻을 찾는 중&hellip;</span>}
          {error && <span className="mt-2 block text-red-600 dark:text-red-400">{error}</span>}

          {/* 대표 뜻 표시 (custom 또는 candidate) */}
          {displayedMeaning && !listOpen && (
            <>
              {displayedMatchedTerm && displayedMatchedTerm !== normalized && (
                <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{displayedMatchedTerm}</span>
              )}
              {displayedPartOfSpeech && (
                <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{displayedPartOfSpeech}</span>
              )}
              <span className="mt-1 block text-sm font-semibold text-zinc-950 dark:text-zinc-50">{displayedMeaning}</span>
              {displayedExample && !isCustomPreferred && (
                <span className="mt-2 block italic text-zinc-500">&ldquo;{displayedExample}&rdquo;</span>
              )}
              <div className="mt-1 flex flex-wrap items-center gap-1">
                {isCustomPreferred ? (
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">내가 입력한 기본 뜻</span>
                ) : (
                  <>
                    {displayedSource && sourceLabel(displayedSource) && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">{sourceLabel(displayedSource)}</span>
                    )}
                    {hasUserPreference && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">내 선택</span>
                    )}
                  </>
                )}
              </div>

              {displayCandidates.length >= 2 && (
                <button
                  type="button"
                  onClick={toggleList}
                  aria-expanded={listOpen}
                  className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  다른 뜻 보기 ({displayCandidates.length + (isCustomPreferred ? 1 : 0)})
                </button>
              )}

              <button
                type="button"
                onClick={() => void handleDoubleClick()}
                aria-label={`${normalized} 뜻 복사`}
                className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                뜻 복사
              </button>
            </>
          )}

          {/* 후보 목록 (펼침) */}
          {displayedMeaning && listOpen && (
            <div className="mt-2">
              <ul
                role="listbox"
                aria-label={createDictionaryListboxLabel(normalized)}
                className="max-h-52 overflow-y-auto rounded-lg border border-zinc-200 dark:border-zinc-700"
              >
                {isCustomPreferred && (
                  <li
                    role="option"
                    aria-selected={true}
                    className="flex cursor-pointer items-start gap-2 border-b border-zinc-100 px-3 py-2.5 text-xs transition last:border-b-0 dark:border-zinc-800"
                  >
                    <span className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400">✓</span>
                    <div className="min-w-0 flex-1">
                      <span className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400">내가 입력한 기본 뜻</span>
                      <span className="block text-sm font-medium text-zinc-950 dark:text-zinc-50">{customMeaning}</span>
                    </div>
                  </li>
                )}
                {displayCandidates.map((candidate, index) => {
                  const key = getCandidateKey(candidate);
                  const isSelected = key === selectedCandidateKey || (!selectedCandidateKey && !index && !isCustomPreferred);
                  const isUserPref = key === selectedCandidateKey && hasUserPreference && !isCustomPreferred;
                  return (
                    <li
                      key={key}
                      role="option"
                      aria-selected={isSelected}
                      tabIndex={0}
                      onClick={() => handleSelectCandidate(candidate)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handleSelectCandidate(candidate);
                        }
                      }}
                      className={`flex cursor-pointer items-start gap-2 border-b border-zinc-100 px-3 py-2.5 text-xs transition last:border-b-0 hover:bg-zinc-50 focus:bg-zinc-50 focus:outline-none dark:border-zinc-800 dark:hover:bg-zinc-800 dark:focus:bg-zinc-800 ${isSelected ? "bg-emerald-50 dark:bg-emerald-950/30" : ""}`}
                    >
                      <span className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400">
                        {isSelected ? "✓" : ""}
                      </span>
                      <div className="min-w-0 flex-1">
                        {candidate.matchedTerm && candidate.matchedTerm !== normalized && (
                          <span className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{candidate.matchedTerm}</span>
                        )}
                        {candidate.partOfSpeech && (
                          <span className="block text-[10px] uppercase tracking-wider text-zinc-400">{candidate.partOfSpeech}</span>
                        )}
                        <span className="block text-sm font-medium text-zinc-950 dark:text-zinc-50">{candidate.meaning}</span>
                        <div className="flex flex-wrap items-center gap-1">
                          {sourceLabel(candidate.source) && (
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">{sourceLabel(candidate.source)}</span>
                          )}
                          {isUserPref && (
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">내 선택</span>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
              {response && response.candidates.length > DISPLAY_CANDIDATE_LIMIT && (
                <p className="mt-1 text-[10px] text-zinc-400">+ {response.candidates.length - DISPLAY_CANDIDATE_LIMIT}개의 추가 뜻</p>
              )}

              {hasUserPreference && (
                <button
                  type="button"
                  onClick={handleResetPreference}
                  className="mt-2 w-full rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/30"
                >
                  기본 추천으로 되돌리기
                </button>
              )}

              <button
                type="button"
                onClick={() => setListOpen(false)}
                className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-xs font-semibold text-zinc-600 dark:border-zinc-700 dark:text-zinc-300"
              >
                닫기
              </button>
            </div>
          )}

          {status === "copied" && <span className="mt-3 block font-semibold text-emerald-600">단어와 뜻을 복사했습니다.</span>}
          {status === "copy-error" && <span className="mt-3 block font-semibold text-red-600">클립보드 복사에 실패했습니다.</span>}
        </span>
      )}
    </span>
  );
}