"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { preferenceService } from "@/lib/dictionary/preference-service";
import {
  deleteSavedWordByNormalized,
  normalizeSavedWord,
  readSavedWords,
  updateSavedWordMeaning,
  upsertWord,
  writeSavedWords,
} from "@/lib/vocabulary-storage";
import type { SavedWord } from "@/types/vocabulary";

type PartOfSpeech = string;

function bestPartOfSpeech(word: SavedWord): PartOfSpeech {
  return word.partOfSpeech?.trim() || "기타";
}

function sourceLabel(source: string | undefined): string | undefined {
  if (!source) return undefined;
  if (source.startsWith("glossary-")) return "경제·시사 용어";
  if (source === "ai") return "AI 추천";
  if (source === "dictionary") return "일반 사전";
  return undefined;
}

function formatSavedDate(timestamp: number): string {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
  }).format(new Date(timestamp));
}

export function VocabularyWorkspace() {
  const [words, setWords] = useState<SavedWord[]>([]);
  const [query, setQuery] = useState("");
  const [posFilter, setPosFilter] = useState<PartOfSpeech | null>(null);
  const [sortKey, setSortKey] = useState<"savedAt" | "word">("savedAt");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMeaning, setEditMeaning] = useState("");
  const [editError, setEditError] = useState("");
  const [notice, setNotice] = useState("");
  const editInputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setWords(readSavedWords());
  }, []);

  const partsOfSpeech = useMemo(() => {
    const unique = new Set(words.map(bestPartOfSpeech));
    return Array.from(unique).sort();
  }, [words]);

  const filteredWords = useMemo(() => {
    let result = words.filter((word) => {
      const normalizedQuery = query.trim().toLocaleLowerCase("ko-KR");
      if (normalizedQuery) {
        return (
          word.word.toLocaleLowerCase("ko-KR").includes(normalizedQuery) ||
          word.meaning.toLocaleLowerCase("ko-KR").includes(normalizedQuery)
        );
      }
      return true;
    });

    if (posFilter) {
      result = result.filter((word) => bestPartOfSpeech(word) === posFilter);
    }

    return result.sort((a, b) => {
      if (sortKey === "word") {
        return a.normalizedWord.localeCompare(b.normalizedWord, "ko-KR");
      }
      return b.savedAt - a.savedAt;
    });
  }, [words, query, posFilter, sortKey]);

  const persistWords = useCallback((next: SavedWord[]) => {
    setWords(next);
    writeSavedWords(next);
  }, []);

  function handleEditStart(word: SavedWord) {
    setEditingId(word.id);
    setEditMeaning(word.meaning);
    setEditError("");
    window.requestAnimationFrame(() => editInputRef.current?.focus());
  }

  function handleEditCancel() {
    setEditingId(null);
    setEditMeaning("");
    setEditError("");
  }

  function handleEditSave(id: string) {
    const trimmed = editMeaning.trim();
    if (!trimmed) {
      setEditError("뜻을 입력해 주세요.");
      return;
    }
    const next = updateSavedWordMeaning(words, id, trimmed);
    if (next === words) return;
    persistWords(next);
    setEditMeaning(trimmed);
    setEditingId(null);
    setEditError("");
    setNotice("뜻이 수정되었습니다.");
  }

  function handleDelete(word: SavedWord) {
    const confirmed = window.confirm(`"${word.word}"을(를) 단어장에서 삭제할까요? 이 작업은 복구할 수 없습니다.`);
    if (!confirmed) return;
    persistWords(deleteSavedWordByNormalized(words, word.normalizedWord));
    setNotice(`"${word.word}"을(를) 삭제했습니다.`);
  }

  function handleSetPreference(word: SavedWord) {
    // 실제 Preference 저장 (candidateKey 기반)
    if (word.candidateKey) {
      preferenceService.saveCandidate(word.word, word.candidateKey);
      // custom preference: candidate 선택 없이 meaning 자체를 custom으로 저장
      preferenceService.saveCustomMeaning(word.word, word.meaning);
      setNotice(`"${word.word}"의 현재 뜻이 기본 뜻으로 저장되었습니다.`);
      return;
    }
    // candidateKey가 없으면 현재 의미를 custom preference로 저장
    preferenceService.saveCustomMeaning(word.word, word.meaning);
    setNotice(`"${word.word}"의 현재 뜻이 기본 뜻으로 저장되었습니다.`);
  }

  if (words.length === 0) {
    return (
      <main className="mx-auto w-full max-w-4xl px-5 py-10 sm:px-8 sm:py-16">
        <section className="rounded-xl border border-dashed border-zinc-300 px-5 py-14 text-center dark:border-zinc-700 sm:px-6 sm:py-16">
          <h1 className="text-lg font-semibold">아직 저장한 단어가 없어요.</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-500">
            필사 중 궁금한 단어에 ★를 누르면
            여기에 차곡차곡 모입니다.
          </p>
          <Link href="/" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-950">
            필사 시작하기
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-10 sm:px-8 sm:py-16">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <header>
          <p className="text-sm font-semibold tracking-[0.18em] text-emerald-600 dark:text-emerald-400">영어필사차곡차곡</p>
          <h1 className="mt-2 text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">내 단어장</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">저장한 단어 {words.length}개</p>
        </header>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/" className="min-h-11 rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold dark:border-zinc-700">← 홈으로</Link>
          <Link href="/review" className="min-h-11 rounded-xl border border-emerald-200 px-4 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/30">
            오늘 복습하기 →
          </Link>
        </div>
      </div>

      {notice && (
        <p role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
          {notice}
        </p>
      )}

      {/* Toolbar: 검색 + 필터 + 정렬 */}
      <div className="mt-5 space-y-3">
        <label htmlFor="vocab-search" className="sr-only">단어 검색</label>
        <input
          id="vocab-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="단어나 뜻으로 검색"
          className="min-h-11 w-full rounded-xl border border-zinc-300 bg-transparent px-4 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-zinc-700"
        />

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setPosFilter(null)}
              aria-pressed={posFilter === null}
              className={`min-h-11 rounded-lg border px-3 text-xs font-semibold transition ${posFilter === null ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300" : "border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"}`}
            >
              전체
            </button>
            {(["명사", "동사", "형용사", "부사", "기타"] as const).filter((pos) => partsOfSpeech.includes(pos)).map((pos) => (
              <button
                key={pos}
                type="button"
                onClick={() => setPosFilter(pos === posFilter ? null : pos)}
                aria-pressed={posFilter === pos}
                className={`min-h-11 rounded-lg border px-3 text-xs font-semibold transition ${posFilter === pos ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300" : "border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"}`}
              >
                {pos}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="vocab-sort" className="text-xs text-zinc-500">정렬</label>
            <select
              id="vocab-sort"
              value={sortKey}
              onChange={(event) => setSortKey(event.target.value as "savedAt" | "word")}
              className="min-h-11 rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-xs outline-none dark:border-zinc-700"
            >
              <option value="savedAt">최근 저장 순</option>
              <option value="word">알파벳 순</option>
            </select>
          </div>
        </div>
      </div>

      {filteredWords.length === 0 ? (
        <section className="mt-8 rounded-xl border border-dashed border-zinc-300 px-5 py-14 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500">조건에 맞는 단어가 없습니다.</p>
          <button type="button" onClick={() => { setQuery(""); setPosFilter(null); }} className="mt-3 text-xs font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300">
            검색 초기화
          </button>
        </section>
      ) : (
        <div className="mt-5 space-y-2">
          {filteredWords.map((word) => {
            const isEditing = editingId === word.id;
            const pos = bestPartOfSpeech(word);
            const srcLabel = sourceLabel(word.dictionarySource);
            const hasPreference = Boolean(word.candidateKey || word.dictionarySource === undefined);

            return (
              <article key={word.id} className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                <div className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">{word.word}</h2>
                        {pos && (
                          <span className="text-[11px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">{pos}</span>
                        )}
                        {srcLabel && (
                          <span className="rounded-md border border-zinc-200 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">{srcLabel}</span>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="mt-2">
                          <textarea
                            ref={editInputRef}
                            value={editMeaning}
                            onChange={(event) => setEditMeaning(event.target.value)}
                            rows={2}
                            className="w-full resize-none rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-950"
                          />
                          {editError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{editError}</p>}
                          <div className="mt-2 flex gap-2">
                            <button type="button" onClick={() => handleEditSave(word.id)} className="min-h-11 rounded-xl bg-zinc-950 px-4 py-2 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-950">저장</button>
                            <button type="button" onClick={handleEditCancel} className="min-h-11 rounded-xl border border-zinc-300 px-4 py-2 text-xs font-semibold dark:border-zinc-700">취소</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{word.meaning}</p>
                          {word.exampleSentence && (
                            <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                              “{word.exampleSentence}”
                            </p>
                          )}
                        </>
                      )}

                      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                        {word.sourceTitle && `${word.sourceTitle} · `}
                        {formatSavedDate(word.savedAt)}
                        {word.updatedAt > word.savedAt + 10000 && ` · ${formatSavedDate(word.updatedAt)} 수정`}
                      </p>
                    </div>
                  </div>

                  {!isEditing && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-800">
                      <button type="button" onClick={() => handleEditStart(word)} className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800">
                        뜻 수정
                      </button>
                      {!hasPreference && (
                        <button type="button" onClick={() => handleSetPreference(word)} className="rounded-lg border border-amber-200 px-2.5 py-1.5 text-[11px] font-semibold text-amber-700 transition hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/30">
                          기본 뜻으로 사용
                        </button>
                      )}
                      {hasPreference && (
                        <span className="rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">기본 뜻 적용됨</span>
                      )}
                      <button type="button" onClick={() => handleDelete(word)} className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30">
                        삭제
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}